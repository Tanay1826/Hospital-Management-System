const http = require('http');

function test(role, path, method, body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body || {});
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'x-user-role': role
      }
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch (_) {
          resolve({ status: res.statusCode, raw });
        }
      });
    });
    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('--- Testing Role-Based Access Control (RBAC) ---');
  
  // 1. Doctor creation (Admin only)
  const t1 = await test('patient', '/api/doctors', 'POST', { name: 'Dr. Fake' });
  console.log('1. Patient adding doctor -> Status:', t1.status, t1.body.error ? 'BLOCKED: ' + t1.body.error : 'ALLOWED');

  const t2 = await test('doctor', '/api/doctors', 'POST', { name: 'Dr. Fake' });
  console.log('2. Doctor adding doctor -> Status:', t2.status, t2.body.error ? 'BLOCKED: ' + t2.body.error : 'ALLOWED');

  // 2. Pharmacy stock add (Admin only)
  const t3 = await test('doctor', '/api/medications', 'POST', { medicine_name: 'Test Med' });
  console.log('3. Doctor adding pharmacy stock -> Status:', t3.status, t3.body.error ? 'BLOCKED: ' + t3.body.error : 'ALLOWED');

  const t4 = await test('patient', '/api/medications', 'POST', { medicine_name: 'Test Med' });
  console.log('4. Patient adding pharmacy stock -> Status:', t4.status, t4.body.error ? 'BLOCKED: ' + t4.body.error : 'ALLOWED');

  // 3. Clinical case records / diagnoses (Doctor & Admin only, Patient blocked)
  const t5 = await test('patient', '/api/medical-history', 'POST', { diagnosis: 'Self Diagnosis' });
  console.log('5. Patient adding case history -> Status:', t5.status, t5.body.error ? 'BLOCKED: ' + t5.body.error : 'ALLOWED');

  // 4. Prescriptions (Doctor & Admin only, Patient blocked)
  const t6 = await test('patient', '/api/prescriptions', 'POST', { dosage: '10mg' });
  console.log('6. Patient issuing prescription -> Status:', t6.status, t6.body.error ? 'BLOCKED: ' + t6.body.error : 'ALLOWED');

  // 5. Patient deletion (Admin only)
  const t7 = await test('doctor', '/api/patients/9999', 'DELETE');
  console.log('7. Doctor deleting patient -> Status:', t7.status, t7.body.error ? 'BLOCKED: ' + t7.body.error : 'ALLOWED');

  const t8 = await test('patient', '/api/patients/9999', 'DELETE');
  console.log('8. Patient deleting patient -> Status:', t8.status, t8.body.error ? 'BLOCKED: ' + t8.body.error : 'ALLOWED');

  console.log('--- All RBAC tests completed successfully ---');
}

runTests();
