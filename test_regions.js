/* eslint-disable */
const { execSync } = require('child_process');

const regions = [
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'ap-south-1', 'ap-southeast-1', 'ap-southeast-2',
  'ap-northeast-1', 'ap-northeast-2', 'ca-central-1',
  'eu-central-1', 'eu-west-1', 'eu-west-2', 'eu-west-3',
  'eu-north-1', 'sa-east-1'
];

for (const region of regions) {
  console.log(`Testing region: ${region}`);
  const dbUrl = `postgresql://postgres.rjpscvvhspvpfplxukhr:Designer.9407740@aws-0-${region}.pooler.supabase.com:6543/postgres`;
  try {
    const output = execSync(`npx supabase db push --db-url "${dbUrl}"`, { stdio: 'pipe' }).toString();
    console.log(`FOUND REGION: ${region}`);
    console.log(output);
    break;
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString() : '';
    const stdout = err.stdout ? err.stdout.toString() : '';
    const combined = stderr + stdout;
    if (!combined.includes('tenant/user postgres.rjpscvvhspvpfplxukhr not found')) {
      console.log(`FOUND REGION: ${region} (with error/success)`);
      console.log(combined);
      break;
    }
  }
}
