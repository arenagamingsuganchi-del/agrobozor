/* eslint-disable */
const https = require('https');

https.get('https://ip-ranges.amazonaws.com/ip-ranges.json', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const json = JSON.parse(data);
    const targetIp = '2406:da1c:61c:d600:7666:c23f:367f:b42b';
    
    // We will parse the IPv6 prefixes and find the matching subnet
    // A simple way to check since IPv6 subnets are hierarchical
    const matches = [];
    for (const item of json.ipv6_prefixes) {
      const prefix = item.ipv6_prefix.toLowerCase();
      // Let's do a basic prefix match. Subnets are usually /40, /48, /56, /64 etc.
      // E.g., if prefix is '2406:da1c:600::/40', we check if target starts with '2406:da1c:6'
      const base = prefix.split('/')[0].replace(/::$/, '').replace(/:$/, '');
      const parts = base.split(':');
      const targetParts = targetIp.split(':');
      
      let isMatch = true;
      for (let i = 0; i < parts.length; i++) {
        if (parts[i] === '') continue;
        // Parse hex values
        const val = parseInt(parts[i], 16);
        const targetVal = parseInt(targetParts[i], 16);
        // Wait, for subnets, we should check CIDR mask, but a simple prefix match on hex works for /48 /64
        if (val !== targetVal) {
          // If the last part has a mask that allows range, e.g. 61c vs 600 under a /40 mask
          const mask = parseInt(prefix.split('/')[1]);
          const bitsToCheck = mask - (i * 16);
          if (bitsToCheck > 0 && bitsToCheck < 16) {
            const shift = 16 - bitsToCheck;
            if ((val >> shift) !== (targetVal >> shift)) {
              isMatch = false;
              break;
            }
          } else {
            isMatch = false;
            break;
          }
        }
      }
      
      if (isMatch) {
        matches.push(item);
      }
    }
    
    console.log("Matching AWS IPv6 prefixes:");
    console.log(JSON.stringify(matches, null, 2));
  });
}).on('error', (err) => {
  console.error("Error fetching AWS IP ranges:", err.message);
});
