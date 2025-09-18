// Test script to verify the portabilite filter functionality
const testStatusFilter = (status) => {
  let paramCount = 0;
  let baseQuery = 'SELECT * FROM portabilites WHERE 1=1';
  let queryParams = [];

  if (status) {
    paramCount++;
    if (status.startsWith('!')) {
      const excludedStatus = status.substring(1);
      baseQuery += ` AND p.status != $${paramCount}`;
      queryParams.push(excludedStatus);
      console.log(`✅ Excluding status: ${excludedStatus}`);
    } else {
      baseQuery += ` AND p.status = $${paramCount}`;
      queryParams.push(status);
      console.log(`✅ Including status: ${status}`);
    }
  } else {
    console.log('✅ No status filter applied');
  }

  return { query: baseQuery, params: queryParams };
};

console.log('=== Testing Portabilite Status Filter ===\n');

console.log('1. Default filter (exclude completed):');
const test1 = testStatusFilter('!termine');
console.log('Query:', test1.query);
console.log('Params:', test1.params);
console.log();

console.log('2. Include only "en_cours":');
const test2 = testStatusFilter('en_cours');
console.log('Query:', test2.query);
console.log('Params:', test2.params);
console.log();

console.log('3. No filter (all statuses):');
const test3 = testStatusFilter('');
console.log('Query:', test3.query);
console.log('Params:', test3.params);
console.log();

console.log('4. Exclude "rejete":');
const test4 = testStatusFilter('!rejete');
console.log('Query:', test4.query);
console.log('Params:', test4.params);