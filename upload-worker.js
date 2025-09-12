#!/usr/bin/env node

// Separate process for uploading profiles to Parca
// This runs independently of the main process to ensure uploads complete
// even if the main process crashes due to OOM

const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const { URL } = require('url');
const { SourceMapper, heap, encode } = require('@datadog/pprof')

async function uploadProfile (profilePath, config) {
  try {
    // Read the profile data and metadata
    if (!fs.existsSync(profilePath)) {
      return { success: false, error: 'Profile file not found' };
    }

    const profileDataJSON = JSON.parse(fs.readFileSync(profilePath));

    let mapper
    try {
      mapper = await SourceMapper.create([process.cwd()])
    } catch (err) {
      console.error(err)
    }

    const encodedProfile = await encode(heap.convertProfile(profileDataJSON, undefined, mapper))
      
    // Prepare Parca WriteRaw request
    const defaultLabels = [
      { name: '__name__', value: 'memory' }
    ];

    const customLabels = Object.entries(config.labels || {}).map(([name, value]) => ({
      name,
      value: String(value)
    }));

    const requestPayload = {
      series: [{
        labels: {
          labels: [...defaultLabels, ...customLabels]
        },
        samples: [{
          raw_profile: encodedProfile.toString('base64')
        }]
      }],
      normalized: false
    };

    const payloadJson = JSON.stringify(requestPayload);
    const endpoint = config.endpoint || 'https://api.polarsignals.com/api/parca/profilestore';
    const url = new URL(endpoint);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    const bearerToken = process.env.POLAR_SIGNALS_TOKEN;

    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payloadJson).toString(),
      ...(bearerToken ? { 'Authorization': `Bearer ${bearerToken}` } : {}),
      ...config.headers,
    };

    return new Promise((resolve) => {
      const req = client.request({
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: `${url.pathname}/profiles/writeraw`,
        method: 'POST',
        headers,
        timeout: config.timeout || 30000, // Longer timeout for worker
      }, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          const success = res.statusCode >= 200 && res.statusCode < 300;
          
          if (success) {
            // Clean up files after successful upload
            try {
              fs.unlinkSync(profilePath);
            } catch (cleanupError) {
            }
          }
          
          resolve({
            success,
            statusCode: res.statusCode,
            error: success ? undefined : `HTTP ${res.statusCode}: ${res.statusMessage}`,
            responseData
          });
        });
      });

      req.on('error', (error) => {
        resolve({
          success: false,
          error: error.message
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          success: false,
          error: 'Request timeout'
        });
      });

      req.write(payloadJson);
      req.end();
    });

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Main worker execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    process.exit(1);
  }

  const configJson = args[0];
  const profilePath = args[1];
  
  try {
    const config = JSON.parse(configJson);
    
    const result = await uploadProfile(profilePath, config);
    
    process.exit(result.success ? 0 : 1);
    
  } catch (error) {
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
