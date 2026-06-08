const { kv } = require('@vercel/kv');
const { put } = require('@vercel/blob');
const seeds = require('./seedData');

// Ensure Vercel KV is seeded on first run
async function ensureSeeded() {
  const seeded = await kv.get('mediflow_seeded');
  if (!seeded) {
    await kv.set('mediflow_clinics', seeds.INITIAL_CLINICS);
    await kv.set('mediflow_users', seeds.INITIAL_USERS);
    await kv.set('mediflow_patients', seeds.INITIAL_PATIENTS);
    await kv.set('mediflow_vitals', seeds.INITIAL_VITALS);
    await kv.set('mediflow_templates', seeds.INITIAL_TEMPLATES);
    await kv.set('mediflow_drugs', seeds.INITIAL_DRUGS);
    await kv.set('mediflow_tests', seeds.INITIAL_TESTS);
    await kv.set('mediflow_advice', seeds.INITIAL_ADVICE);
    await kv.set('mediflow_appointments', seeds.INITIAL_APPOINTMENTS);
    await kv.set('mediflow_bills', seeds.INITIAL_BILLS);
    await kv.set('mediflow_insurance', seeds.INITIAL_INSURANCE);
    await kv.set('mediflow_attendance', seeds.INITIAL_ATTENDANCE);
    await kv.set('mediflow_doctor_slots', seeds.INITIAL_DOCTOR_SLOTS);
    await kv.set('mediflow_patient_accounts', []);
    await kv.set('mediflow_prescriptions', []);
    await kv.set('mediflow_drug_categories', seeds.INITIAL_DRUG_CATEGORIES);
    await kv.set('mediflow_specialities', seeds.INITIAL_SPECIALITIES);
    
    await kv.set('mediflow_seeded', 'true');
    console.log('Vercel KV Seeded successfully.');
  } else {
    // Safety check: Make sure Super Admin exists in the user database
    let users = await kv.get('mediflow_users');
    if (typeof users === 'string') {
      try { users = JSON.parse(users); } catch (e) { users = []; }
    }
    const userList = Array.isArray(users) ? users : [];
    const hasAdmin = userList.some(u => u.username === 'admin');
    if (!hasAdmin) {
      userList.push({ username: 'admin', password: 'password', role: 'admin', clinicId: null, name: 'Super Administrator' });
      await kv.set('mediflow_users', userList);
      console.log('Super Admin user restored to existing database.');
    }
  }
}

// Database Action Handler
async function executeDbAction(action, payload) {
  await ensureSeeded();

  const getList = async (key) => {
    const raw = await kv.get(key);
    if (!raw) return [];
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch (err) {
        console.error(`Error parsing KV key ${key}:`, err);
        return [];
      }
    }
    return raw;
  };
  const saveList = async (key, data) => {
    await kv.set(key, data);
  };

  switch (action) {
    case 'reseedDatabase': {
      await kv.set('mediflow_clinics', seeds.INITIAL_CLINICS);
      await kv.set('mediflow_users', seeds.INITIAL_USERS);
      await kv.set('mediflow_patients', seeds.INITIAL_PATIENTS);
      await kv.set('mediflow_vitals', seeds.INITIAL_VITALS);
      await kv.set('mediflow_templates', seeds.INITIAL_TEMPLATES);
      await kv.set('mediflow_drugs', seeds.INITIAL_DRUGS);
      await kv.set('mediflow_tests', seeds.INITIAL_TESTS);
      await kv.set('mediflow_advice', seeds.INITIAL_ADVICE);
      await kv.set('mediflow_appointments', seeds.INITIAL_APPOINTMENTS);
      await kv.set('mediflow_bills', seeds.INITIAL_BILLS);
      await kv.set('mediflow_insurance', seeds.INITIAL_INSURANCE);
      await kv.set('mediflow_attendance', seeds.INITIAL_ATTENDANCE);
      await kv.set('mediflow_doctor_slots', seeds.INITIAL_DOCTOR_SLOTS);
      await kv.set('mediflow_patient_accounts', []);
      await kv.set('mediflow_prescriptions', []);
      await kv.set('mediflow_drug_categories', seeds.INITIAL_DRUG_CATEGORIES);
      await kv.set('mediflow_specialities', seeds.INITIAL_SPECIALITIES);
      await kv.set('mediflow_seeded', 'true');
      return { success: true, message: 'Database reseeded successfully.' };
    }

    case 'getClinics':
      return await getList('mediflow_clinics');

    case 'saveClinic': {
      const clinics = await getList('mediflow_clinics');
      const index = clinics.findIndex(c => c.id === payload.id);
      if (index > -1) {
        clinics[index] = { ...clinics[index], ...payload };
      } else {
        clinics.push(payload);
      }
      await saveList('mediflow_clinics', clinics);
      return payload;
    }

    case 'deleteClinic': {
      const clinics = await getList('mediflow_clinics');
      const filtered = clinics.filter(c => c.id !== payload.id);
      await saveList('mediflow_clinics', filtered);
      return { success: true };
    }

    case 'getUsers':
      return await getList('mediflow_users');

    case 'saveUser': {
      const users = await getList('mediflow_users');
      const index = users.findIndex(u => u.username === payload.username);
      if (index > -1) {
        users[index] = { ...users[index], ...payload };
      } else {
        users.push(payload);
      }
      await saveList('mediflow_users', users);
      return payload;
    }

    case 'deleteUser': {
      const users = await getList('mediflow_users');
      const filtered = users.filter(u => u.username !== payload.username);
      await saveList('mediflow_users', filtered);
      return { success: true };
    }

    case 'getPatients': {
      const patients = await getList('mediflow_patients');
      return patients.filter(p => p.clinicId === payload.clinicId);
    }

    case 'savePatient': {
      const patients = await getList('mediflow_patients');
      const index = patients.findIndex(p => p.id === payload.id && p.clinicId === payload.clinicId);
      if (index > -1) {
        patients[index] = { ...patients[index], ...payload };
      } else {
        patients.push(payload);
      }
      await saveList('mediflow_patients', patients);
      return payload;
    }

    case 'getVitals': {
      const vitals = await getList('mediflow_vitals');
      return vitals.filter(v => v.clinicId === payload.clinicId);
    }

    case 'saveVitals': {
      const vitals = await getList('mediflow_vitals');
      const index = vitals.findIndex(v => v.patientId === payload.patientId && v.clinicId === payload.clinicId);
      if (index > -1) {
        vitals[index] = { ...vitals[index], ...payload };
      } else {
        vitals.push(payload);
      }
      await saveList('mediflow_vitals', vitals);
      return payload;
    }

    case 'getTemplates': {
      const templates = await getList('mediflow_templates');
      return templates.filter(t => t.doctorUsername === payload.doctorUsername && t.clinicId === payload.clinicId);
    }

    case 'saveTemplate': {
      const templates = await getList('mediflow_templates');
      const index = templates.findIndex(t => t.id === payload.id);
      if (index > -1) {
        templates[index] = { ...templates[index], ...payload };
      } else {
        templates.push(payload);
      }
      await saveList('mediflow_templates', templates);
      return payload;
    }

    case 'deleteTemplate': {
      const templates = await getList('mediflow_templates');
      const filtered = templates.filter(t => t.id !== payload.id);
      await saveList('mediflow_templates', filtered);
      return { success: true };
    }

    case 'getDrugs': {
      const drugs = await getList('mediflow_drugs');
      return drugs.filter(d => d.doctorUsername === payload.doctorUsername && d.clinicId === payload.clinicId);
    }

    case 'saveDrug': {
      const drugs = await getList('mediflow_drugs');
      const index = drugs.findIndex(d => d.id === payload.id);
      if (index > -1) {
        drugs[index] = { ...drugs[index], ...payload };
      } else {
        drugs.push(payload);
      }
      await saveList('mediflow_drugs', drugs);
      return payload;
    }

    case 'deleteDrug': {
      const drugs = await getList('mediflow_drugs');
      const filtered = drugs.filter(d => d.id !== payload.id);
      await saveList('mediflow_drugs', filtered);
      return { success: true };
    }

    case 'getTests': {
      const tests = await getList('mediflow_tests');
      return tests.filter(t => t.doctorUsername === payload.doctorUsername);
    }

    case 'saveTest': {
      const tests = await getList('mediflow_tests');
      const index = tests.findIndex(t => t.id === payload.id);
      if (index > -1) {
        tests[index] = { ...tests[index], ...payload };
      } else {
        tests.push(payload);
      }
      await saveList('mediflow_tests', tests);
      return payload;
    }

    case 'deleteTest': {
      const tests = await getList('mediflow_tests');
      const filtered = tests.filter(t => t.id !== payload.id);
      await saveList('mediflow_tests', filtered);
      return { success: true };
    }

    case 'getAdvice': {
      const advice = await getList('mediflow_advice');
      return advice.filter(a => a.doctorUsername === payload.doctorUsername);
    }

    case 'saveAdvice': {
      const advice = await getList('mediflow_advice');
      const index = advice.findIndex(a => a.id === payload.id);
      if (index > -1) {
        advice[index] = { ...advice[index], ...payload };
      } else {
        advice.push(payload);
      }
      await saveList('mediflow_advice', advice);
      return payload;
    }

    case 'deleteAdvice': {
      const advice = await getList('mediflow_advice');
      const filtered = advice.filter(a => a.id !== payload.id);
      await saveList('mediflow_advice', filtered);
      return { success: true };
    }

    case 'getAppointments': {
      const appointments = await getList('mediflow_appointments');
      return appointments.filter(a => a.clinicId === payload.clinicId);
    }

    case 'saveAppointment': {
      const appointments = await getList('mediflow_appointments');
      const index = appointments.findIndex(a => a.id === payload.id);
      if (index > -1) {
        appointments[index] = { ...appointments[index], ...payload };
      } else {
        appointments.push(payload);
      }
      await saveList('mediflow_appointments', appointments);
      return payload;
    }

    case 'deleteAppointment': {
      const appointments = await getList('mediflow_appointments');
      const filtered = appointments.filter(a => a.id !== payload.id);
      await saveList('mediflow_appointments', filtered);
      return { success: true };
    }

    case 'getBills': {
      const bills = await getList('mediflow_bills');
      return bills.filter(b => b.clinicId === payload.clinicId);
    }

    case 'saveBill': {
      const bills = await getList('mediflow_bills');
      const index = bills.findIndex(b => b.id === payload.id);
      if (index > -1) {
        bills[index] = { ...bills[index], ...payload };
      } else {
        bills.push(payload);
      }
      await saveList('mediflow_bills', bills);
      return payload;
    }

    case 'getInsurance': {
      const insurance = await getList('mediflow_insurance');
      return insurance.filter(i => i.clinicId === payload.clinicId);
    }

    case 'saveInsurance': {
      const insurance = await getList('mediflow_insurance');
      const index = insurance.findIndex(i => i.id === payload.id);
      if (index > -1) {
        insurance[index] = { ...insurance[index], ...payload };
      } else {
        insurance.push(payload);
      }
      await saveList('mediflow_insurance', insurance);
      return payload;
    }

    case 'getAttendance': {
      const attendance = await getList('mediflow_attendance');
      return attendance.filter(a => a.clinicId === payload.clinicId);
    }

    case 'saveAttendance': {
      const attendance = await getList('mediflow_attendance');
      const index = attendance.findIndex(a => a.id === payload.id);
      if (index > -1) {
        attendance[index] = { ...attendance[index], ...payload };
      } else {
        attendance.push(payload);
      }
      await saveList('mediflow_attendance', attendance);
      return payload;
    }

    case 'getPatientAccounts':
      return await getList('mediflow_patient_accounts');

    case 'getPatientAccountByPhone': {
      const accounts = await getList('mediflow_patient_accounts');
      return accounts.find(a => a.phone === payload.phone) || null;
    }

    case 'savePatientAccount': {
      const accounts = await getList('mediflow_patient_accounts');
      const index = accounts.findIndex(a => a.id === payload.id);
      if (index > -1) {
        accounts[index] = { ...accounts[index], ...payload };
      } else {
        accounts.push(payload);
      }
      await saveList('mediflow_patient_accounts', accounts);
      return payload;
    }

    case 'getDoctorSlots': {
      const slots = await getList('mediflow_doctor_slots');
      return slots.filter(s => s.clinicId === payload.clinicId);
    }

    case 'getDoctorSlotConfig': {
      const slots = await getList('mediflow_doctor_slots');
      return slots.find(s => s.doctorUsername === payload.doctorUsername && s.clinicId === payload.clinicId) || null;
    }

    case 'saveDoctorSlotConfig': {
      const slots = await getList('mediflow_doctor_slots');
      const index = slots.findIndex(s => s.doctorUsername === payload.doctorUsername && s.clinicId === payload.clinicId);
      if (index > -1) {
        slots[index] = { ...slots[index], ...payload };
      } else {
        slots.push(payload);
      }
      await saveList('mediflow_doctor_slots', slots);
      return payload;
    }

    case 'getPrescriptions': {
      const prescriptions = await getList('mediflow_prescriptions');
      if (payload.clinicId && payload.patientId) {
        return prescriptions.filter(p => p.clinicId === payload.clinicId && p.patientId === payload.patientId);
      }
      if (payload.clinicId) {
        return prescriptions.filter(p => p.clinicId === payload.clinicId);
      }
      return prescriptions;
    }

    case 'savePrescription': {
      const prescriptions = await getList('mediflow_prescriptions');
      const index = prescriptions.findIndex(p => p.id === payload.id);
      if (index > -1) {
        prescriptions[index] = { ...prescriptions[index], ...payload };
      } else {
        prescriptions.push(payload);
      }
      await saveList('mediflow_prescriptions', prescriptions);
      return payload;
    }

    case 'getAppointmentsByPhone': {
      const appointments = await getList('mediflow_appointments');
      return appointments.filter(a => a.patientPhone === payload.phone);
    }

    case 'getBillsByPhone': {
      const bills = await getList('mediflow_bills');
      return bills.filter(b => b.patientPhone === payload.phone);
    }

    case 'getDrugCategories': {
      const categories = await getList('mediflow_drug_categories');
      return categories.filter(c => c.doctorUsername === payload.doctorUsername && c.clinicId === payload.clinicId);
    }

    case 'saveDrugCategory': {
      const categories = await getList('mediflow_drug_categories');
      const index = categories.findIndex(c => c.id === payload.id);
      if (index > -1) {
        categories[index] = { ...categories[index], ...payload };
      } else {
        categories.push(payload);
      }
      await saveList('mediflow_drug_categories', categories);
      return payload;
    }

    case 'deleteDrugCategory': {
      const categories = await getList('mediflow_drug_categories');
      const filtered = categories.filter(c => c.id !== payload.id);
      await saveList('mediflow_drug_categories', filtered);
      return { success: true };
    }

    case 'getSpecialities': {
      const specs = await getList('mediflow_specialities');
      return specs.filter(s => s.clinicId === payload.clinicId);
    }

    case 'saveSpeciality': {
      const specs = await getList('mediflow_specialities');
      const { clinicId, name, icon, oldName } = payload;
      
      if (oldName) {
        const index = specs.findIndex(s => s.clinicId === clinicId && s.name.toLowerCase() === oldName.toLowerCase());
        if (index > -1) {
          specs[index] = { clinicId, name, icon };
        } else {
          specs.push({ clinicId, name, icon });
        }
        
        if (oldName.toLowerCase() !== name.toLowerCase()) {
          const users = await getList('mediflow_users');
          let updated = false;
          users.forEach(u => {
            if (u.clinicId === clinicId && u.role === 'doctor' && u.speciality && u.speciality.toLowerCase() === oldName.toLowerCase()) {
              u.speciality = name;
              updated = true;
            }
          });
          if (updated) {
            await saveList('mediflow_users', users);
          }
        }
      } else {
        const index = specs.findIndex(s => s.clinicId === clinicId && s.name.toLowerCase() === name.toLowerCase());
        if (index > -1) {
          specs[index] = { clinicId, name, icon };
        } else {
          specs.push({ clinicId, name, icon });
        }
      }
      await saveList('mediflow_specialities', specs);
      return payload;
    }

    case 'deleteSpeciality': {
      const specs = await getList('mediflow_specialities');
      const { clinicId, name } = payload;
      const filtered = specs.filter(s => !(s.clinicId === clinicId && s.name.toLowerCase() === name.toLowerCase()));
      await saveList('mediflow_specialities', filtered);
      
      const users = await getList('mediflow_users');
      let updated = false;
      users.forEach(u => {
        if (u.clinicId === clinicId && u.role === 'doctor' && u.speciality && u.speciality.toLowerCase() === name.toLowerCase()) {
          u.speciality = '';
          updated = true;
        }
      });
      if (updated) {
        await saveList('mediflow_users', users);
      }
      return { success: true };
    }

    // --- Inquiries (Prospective Clinic Inquiries) ---
    case 'getInquiries':
      return await getList('mediflow_inquiries');

    case 'saveInquiry': {
      const inquiries = await getList('mediflow_inquiries');
      if (!payload.id) {
        payload.id = 'inq-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      }
      if (!payload.timestamp) {
        payload.timestamp = new Date().toISOString();
      }
      inquiries.push(payload);
      await saveList('mediflow_inquiries', inquiries);
      return payload;
    }

    case 'deleteInquiry': {
      const inquiries = await getList('mediflow_inquiries');
      const filtered = inquiries.filter(i => i.id !== payload.id);
      await saveList('mediflow_inquiries', filtered);
      return { success: true };
    }

    default:
      throw new Error(`Unknown Vercel Database operation: ${action}`);
  }
}

// Serverless Handler Router
module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const path = req.url.split('?')[0];

  // 1. Health
  if (path.endsWith('/health')) {
    return res.status(200).json({ status: 'ok', message: 'MediFlow Clinical API Router Online' });
  }

  // 2. Vercel Blobs
  if (path.endsWith('/blobs')) {
    try {
      if (req.method === 'GET') {
        const clinicId = req.query.clinicId;
        if (!clinicId) {
          return res.status(400).json({ error: 'clinicId is required' });
        }
        const url = await kv.get(`mediflow_header_${clinicId}`);
        return res.status(200).json({ url: url || '' });
      }

      if (req.method === 'POST') {
        const { clinicId, dataUrl } = req.body;
        if (!clinicId || !dataUrl) {
          return res.status(400).json({ error: 'clinicId and dataUrl are required' });
        }

        const parts = dataUrl.split(';base64,');
        const contentType = parts[0].split(':')[1];
        const base64Data = parts[1];
        const buffer = Buffer.from(base64Data, 'base64');

        // Store to Vercel Blob
        const blob = await put(`logos/${clinicId}.png`, buffer, {
          access: 'public',
          contentType
        });

        // Store KV reference
        await kv.set(`mediflow_header_${clinicId}`, blob.url);

        return res.status(200).json({ success: true, url: blob.url });
      }
    } catch (err) {
      return res.status(500).json({ error: 'Blob operation failed', message: err.message });
    }
  }

  // 3. Vercel KV Database
  if (path.endsWith('/db')) {
    try {
      const { action, payload } = req.body;
      const hasDbConfig = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

      if (action === 'check') {
        return res.status(200).json({ cloudActive: hasDbConfig });
      }

      if (!hasDbConfig) {
        return res.status(503).json({ error: 'Vercel KV config missing' });
      }

      const data = await executeDbAction(action, payload);
      return res.status(200).json({ data });
    } catch (err) {
      return res.status(500).json({ error: 'Database operation failed', message: err.message });
    }
  }

  // 4. Default 404
  return res.status(404).json({ error: 'Endpoint not found' });
};
