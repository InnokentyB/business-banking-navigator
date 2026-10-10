// Local configuration gate. Reads values but prints only presence and validation status.
const required = process.argv.includes('--require-live');
const tavily = typeof process.env.TAVILY_API_KEY === 'string' && process.env.TAVILY_API_KEY.trim().length > 0;
const nebius = typeof process.env.NEBIUS_API_KEY === 'string' && process.env.NEBIUS_API_KEY.trim().length > 0;
const model = process.env.NEBIUS_MODEL?.trim() || 'nvidia/nemotron-3-super-120b-a12b';
const modelValid = /^nvidia\/[A-Za-z0-9._/-]+$/.test(model);
const issues = [];
if (!modelValid) issues.push('NEBIUS_MODEL must identify an NVIDIA model');
if (required && !tavily) issues.push('TAVILY_API_KEY absent');
if (required && !nebius) issues.push('NEBIUS_API_KEY absent');
console.log(JSON.stringify({ liveRequired: required, tavilyKeyPresent: tavily, nebiusKeyPresent: nebius, modelValid, configurationValid: modelValid, liveReady: modelValid && tavily && nebius, issues }));
if (issues.length) process.exitCode = 1;
