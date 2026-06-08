const INITIAL_CLINICS = [
  { 
    id: 'clinic-1', 
    name: 'Aarogyam Multi-specialty Clinic', 
    subscription: 'Active', 
    logoUrl: '',
    city: 'Mumbai',
    address: '12, Andheri West, Mumbai – 400053',
    phone: '+91-22-4567-8900',
    upiId: 'aarogyam@upi',
    consultationFee: 400,
    billingModel: 'Subscription',
    rate: 5000, // ₹5000 / month
    payments: [
      { invoiceDate: '2026-03-01', amountDue: 5000, amountPaid: 5000, status: 'Paid', paymentDate: '2026-03-03' },
      { invoiceDate: '2026-04-01', amountDue: 5000, amountPaid: 5000, status: 'Paid', paymentDate: '2026-04-02' },
      { invoiceDate: '2026-05-01', amountDue: 5000, amountPaid: 0, status: 'Overdue', paymentDate: null }
    ]
  },
  { 
    id: 'clinic-2', 
    name: 'Danta Seva Dental Care', 
    subscription: 'Active', 
    logoUrl: '',
    city: 'Pune',
    address: '8, Koregaon Park, Pune – 411001',
    phone: '+91-20-2765-4321',
    upiId: 'dantaseva@upi',
    consultationFee: 500,
    billingModel: 'PerPatient',
    rate: 20, // ₹20 / patient entry
    payments: [
      { invoiceDate: '2026-03-01', patientCount: 45, amountDue: 900, amountPaid: 900, status: 'Paid', paymentDate: '2026-03-05' },
      { invoiceDate: '2026-04-01', patientCount: 52, amountDue: 1040, amountPaid: 1040, status: 'Paid', paymentDate: '2026-04-04' },
      { invoiceDate: '2026-05-01', patientCount: 30, amountDue: 600, amountPaid: 600, status: 'Paid', paymentDate: '2026-05-05' }
    ]
  }
];

const INITIAL_USERS = [
  // Super Admin
  { username: 'admin', password: 'password', role: 'admin', clinicId: null, name: 'Super Administrator' },
  // Clinic 1 Admin
  { username: 'cadmin1', password: 'password', role: 'clinic_admin', clinicId: 'clinic-1', name: 'Aarav Sharma (Manager)', status: 'Active' },
  // Clinic 2 Admin
  { username: 'cadmin2', password: 'password', role: 'clinic_admin', clinicId: 'clinic-2', name: 'Priya Patel (Manager)', status: 'Active' },
  // Clinic 1 Staff
  { username: 'staff1', password: 'password', role: 'staff', clinicId: 'clinic-1', name: 'Nurse Sunita Nair', permissions: ['reception', 'finance'] },
  { username: 'staff2', password: 'password', role: 'staff', clinicId: 'clinic-1', name: 'Amit Patel', permissions: ['reception'] },
  // Clinic 1 Doctors
  { 
    username: 'doctor1', 
    password: 'password', 
    role: 'doctor', 
    clinicId: 'clinic-1', 
    name: 'Dr. Rajesh Iyer', 
    qualification: 'MD, FACP (Internal Medicine)', 
    designation: 'Senior Consultant Physician',
    speciality: 'General Medicine'
  },
  { 
    username: 'doctor2', 
    password: 'password', 
    role: 'doctor', 
    clinicId: 'clinic-1', 
    name: 'Dr. Amit Verma', 
    qualification: 'MBBS, DLO (Otolaryngology)', 
    designation: 'ENT Specialist',
    speciality: 'ENT'
  },
  // Clinic 2 Doctor
  { 
    username: 'doctor3', 
    password: 'password', 
    role: 'doctor', 
    clinicId: 'clinic-2', 
    name: 'Dr. Shalini Gupta', 
    qualification: 'DDS, Cosmetic Dentistry', 
    designation: 'Lead Dental Practitioner',
    speciality: 'Dental'
  }
];

const INITIAL_PATIENTS = [
  { id: 'P-1001', clinicId: 'clinic-1', name: 'Jayesh Mehta', age: 42, gender: 'Male', mobile: '9876543210', registeredAt: '2026-05-20' },
  { id: 'P-1002', clinicId: 'clinic-1', name: 'Ananya Iyer', age: 29, gender: 'Female', mobile: '9876543211', registeredAt: '2026-05-22' },
  { id: 'P-1003', clinicId: 'clinic-2', name: 'Vikram Malhotra', age: 55, gender: 'Male', mobile: '9876543212', registeredAt: '2026-05-24' },
  { id: 'P-1004', clinicId: 'clinic-1', name: 'Rahul Dravid', age: 45, gender: 'Male', mobile: '9876543220', registeredAt: '2026-05-25' },
  { id: 'P-1005', clinicId: 'clinic-1', name: 'Kavita Reddy', age: 34, gender: 'Female', mobile: '9876543221', registeredAt: '2026-05-25' },
  { id: 'P-1006', clinicId: 'clinic-1', name: 'Devendra Singh', age: 61, gender: 'Male', mobile: '9876543222', registeredAt: '2026-05-26' },
  { id: 'P-1007', clinicId: 'clinic-1', name: 'Meera Deshmukh', age: 28, gender: 'Female', mobile: '9876543223', registeredAt: '2026-05-26' },
  { id: 'P-1008', clinicId: 'clinic-1', name: 'Arjun Kapoor', age: 38, gender: 'Male', mobile: '9876543224', registeredAt: '2026-05-27' }
];

const INITIAL_VITALS = [
  {
    patientId: 'P-1001',
    clinicId: 'clinic-1',
    height: '178 cm',
    weight: '82 kg',
    pulse: '76 bpm',
    bp: '130/85 mmHg',
    spo2: '99%',
    enteredBy: 'staff1',
    updatedAt: '2026-05-26T10:00:00Z'
  },
  {
    patientId: 'P-1002',
    clinicId: 'clinic-1',
    height: '162 cm',
    weight: '58 kg',
    pulse: '82 bpm',
    bp: '110/70 mmHg',
    spo2: '98%',
    enteredBy: 'staff1',
    updatedAt: '2026-05-26T11:30:00Z'
  }
];

// Doctor configurations (isolated by doctorUsername)
const INITIAL_TEMPLATES = [
  // Dr. Rajesh Iyer (doctor1)
  {
    id: 't1',
    doctorUsername: 'doctor1',
    clinicId: 'clinic-1',
    specialty: 'General',
    name: 'Acute Fever Management',
    chiefComplaints: 'High grade fever since 3 days, generalized body aches, chills, and mild dry cough.',
    signsSymptoms: 'Temp: 101.5 F, congested throat, clear chest sounds.',
    medicalHistory: 'No known co-morbidities. Non-smoker, non-alcoholic.',
    drugHistory: 'Self-medicated with Paracetamol 500mg SOS.',
    allergies: 'NKDA (No Known Drug Allergies)',
    findingsDiagnosis: 'Acute Viral Syndrome / Suspected Influenza',
    prescriptionBody: 'Tab. Paracetamol 650mg -- 1 tab three times daily after meals -- 5 days (For Fever & Body Aches)\nCap. Amoxicillin 500mg -- 1 cap twice daily after meals -- 5 days (Prophylactic)\nSyp. Dextromethorphan HBr 10ml -- twice daily -- 5 days (For Cough)'
  },
  {
    id: 't2',
    doctorUsername: 'doctor1',
    clinicId: 'clinic-1',
    specialty: 'General',
    name: 'Hypertension Follow-Up',
    chiefComplaints: 'Routine follow-up for Hypertension. Occasional mild morning headache.',
    signsSymptoms: 'BP: 140/90 mmHg, Pulse: 72 bpm, chest clear.',
    medicalHistory: 'Hypertensive since 4 years on regular medication.',
    drugHistory: 'Tab. Amlodipine 5mg OD.',
    allergies: 'None reported.',
    findingsDiagnosis: 'Essential Hypertension (Stage 1) - Borderline Controlled',
    prescriptionBody: 'Tab. Amlodipine 5mg -- 1 tab daily at morning -- 30 days\nTab. Telmisartan 40mg -- 1 tab daily at bedtime -- 30 days'
  },
  {
    id: 't3',
    doctorUsername: 'doctor1',
    clinicId: 'clinic-1',
    specialty: 'Derma',
    name: 'Atopic Dermatitis Care',
    chiefComplaints: 'Severe itching and red rashes in elbow creases and behind knees for 2 weeks.',
    signsSymptoms: 'Erythematous, dry, lichenified plaques visible.',
    medicalHistory: 'History of childhood asthma and allergic rhinitis.',
    drugHistory: 'Used OTC moisturizing lotions without relief.',
    allergies: 'Allergic to sulfonamides.',
    findingsDiagnosis: 'Atopic Dermatitis (Eczema)',
    prescriptionBody: 'CRM. Mometasone Furoate 0.1% -- Apply thin layer twice daily to affected areas -- 10 days\nTab. Cetirizine 10mg -- 1 tab daily at bedtime -- 15 days\nEmollient Moisturizer -- Apply liberally 3-4 times daily -- Ongoing'
  },
  
  // Dr. Amit Verma (doctor2)
  {
    id: 't4',
    doctorUsername: 'doctor2',
    clinicId: 'clinic-1',
    specialty: 'ENT',
    name: 'Acute Otitis Media',
    chiefComplaints: 'Severe throbbing pain in the right ear since 2 days, blocked sensation, and mild fever.',
    signsSymptoms: 'Right tympanic membrane is congested, bulging, with loss of light reflex.',
    medicalHistory: 'Recent history of upper respiratory tract infection.',
    drugHistory: 'Paracetamol taken for pain relief.',
    allergies: 'NKDA',
    findingsDiagnosis: 'Acute Otitis Media (Right Ear)',
    prescriptionBody: 'Tab. Amoxicillin-Clavulanate 625mg -- 1 tab twice daily -- 7 days\nEar Drops Ofloxacin -- 3 drops in right ear three times daily -- 7 days\nTab. Ibuprofen 400mg + Paracetamol 325mg -- 1 tab SOS for severe pain'
  },
  {
    id: 't5',
    doctorUsername: 'doctor2',
    clinicId: 'clinic-1',
    specialty: 'ENT',
    name: 'Allergic Rhinitis Protocol',
    chiefComplaints: 'Bouts of morning sneezing, clear watery nasal discharge, and itchy eyes since 3 weeks.',
    signsSymptoms: 'Nasal mucosa pale and boggy, turbinate hypertrophy present.',
    medicalHistory: 'Dust and pollen allergy.',
    drugHistory: 'Used local antihistamines occasionally.',
    allergies: 'None.',
    findingsDiagnosis: 'Allergic Rhinitis',
    prescriptionBody: 'Spray Fluticasone Furoate -- 2 sprays in each nostril once daily -- 1 month\nTab. Fexofenadine 120mg -- 1 tab daily at bedtime -- 14 days'
  }
];

const INITIAL_DRUGS = [
  // doctor1 (General / Derma)
  { id: 'd1', doctorUsername: 'doctor1', clinicId: 'clinic-1', name: 'Paracetamol 650mg', category: 'NSAIDs/Analgesics' },
  { id: 'd2', doctorUsername: 'doctor1', clinicId: 'clinic-1', name: 'Ibuprofen 400mg', category: 'NSAIDs/Analgesics' },
  { id: 'd3', doctorUsername: 'doctor1', clinicId: 'clinic-1', name: 'Amoxicillin 500mg', category: 'Antibiotics' },
  { id: 'd4', doctorUsername: 'doctor1', clinicId: 'clinic-1', name: 'Azithromycin 500mg', category: 'Antibiotics' },
  { id: 'd5', doctorUsername: 'doctor1', clinicId: 'clinic-1', name: 'Cetirizine 10mg', category: 'General' },
  { id: 'd6', doctorUsername: 'doctor1', clinicId: 'clinic-1', name: 'Amlodipine 5mg', category: 'General' },
  { id: 'd7', doctorUsername: 'doctor1', clinicId: 'clinic-1', name: 'Telmisartan 40mg', category: 'General' },
  { id: 'd8', doctorUsername: 'doctor1', clinicId: 'clinic-1', name: 'Hydrocortisone 1% Cream', category: 'Derma' },
  { id: 'd9', doctorUsername: 'doctor1', clinicId: 'clinic-1', name: 'Mometasone Furoate 0.1% Cream', category: 'Derma' },

  // doctor2 (ENT)
  { id: 'd10', doctorUsername: 'doctor2', clinicId: 'clinic-1', name: 'Amoxicillin-Clavulanate 625mg', category: 'Antibiotics' },
  { id: 'd11', doctorUsername: 'doctor2', clinicId: 'clinic-1', name: 'Ofloxacin Ear Drops', category: 'General' },
  { id: 'd12', doctorUsername: 'doctor2', clinicId: 'clinic-1', name: 'Fluticasone Furoate Nasal Spray', category: 'General' },
  { id: 'd13', doctorUsername: 'doctor2', clinicId: 'clinic-1', name: 'Fexofenadine 120mg', category: 'General' },
  { id: 'd14', doctorUsername: 'doctor2', clinicId: 'clinic-1', name: 'Montelukast 10mg + Levocetirizine 5mg', category: 'General' }
];

const INITIAL_TESTS = [
  // doctor1
  { id: 'ts1', doctorUsername: 'doctor1', name: 'Complete Blood Count (CBC)' },
  { id: 'ts2', doctorUsername: 'doctor1', name: 'Widal Agglutination Test' },
  { id: 'ts3', doctorUsername: 'doctor1', name: 'Dengue NS1 Antigen (ELISA)' },
  { id: 'ts4', doctorUsername: 'doctor1', name: 'HbA1c & Fasting Blood Sugar' },
  { id: 'ts5', doctorUsername: 'doctor1', name: 'Lipid Profile Panel' },
  { id: 'ts6', doctorUsername: 'doctor1', name: 'Serum Creatinine & Blood Urea' },
  
  // doctor2
  { id: 'ts7', doctorUsername: 'doctor2', name: 'Absolute Eosinophil Count (AEC)' },
  { id: 'ts8', doctorUsername: 'doctor2', name: 'Total Serum IgE' },
  { id: 'ts9', doctorUsername: 'doctor2', name: 'CT Scan Paranasal Sinuses (PNS)' },
  { id: 'ts10', doctorUsername: 'doctor2', name: 'Pure Tone Audiometry (PTA)' }
];

const INITIAL_ADVICE = [
  // doctor1
  { id: 'a1', doctorUsername: 'doctor1', name: 'Fever Care', text: 'Drink warm fluids (herbal teas, broths). Rest completely. Monitor temperature every 4 hours.' },
  { id: 'a2', doctorUsername: 'doctor1', name: 'Low Sodium Diet', text: 'Avoid extra salt. Restrict consumption of pickles, processed cheeses, and canned items.' },
  { id: 'a3', doctorUsername: 'doctor1', name: 'Diabetic Foot Care', text: 'Check feet daily for cuts or redness. Wear soft footwear. Keep feet clean and moisturized.' },
  { id: 'a4', doctorUsername: 'doctor1', name: 'Hydration Guidelines', text: 'Drink at least 3-4 liters of water daily to maintain electrolyte balance.' },

  // doctor2
  { id: 'a5', doctorUsername: 'doctor2', name: 'Allergy Avoidance', text: 'Use a double-layer mask outdoors. Avoid dust, pet hair, and direct exposure to air conditioning vents.' },
  { id: 'a6', doctorUsername: 'doctor2', name: 'Ear Dryness Protocol', text: 'Do not allow water to enter ears during bathing. Use silicon earplugs. Do not use cotton buds.' }
];

// Attach to window object for legacy script tag access
window.INITIAL_CLINICS = INITIAL_CLINICS;
window.INITIAL_USERS = INITIAL_USERS;
window.INITIAL_PATIENTS = INITIAL_PATIENTS;
window.INITIAL_VITALS = INITIAL_VITALS;
window.INITIAL_TEMPLATES = INITIAL_TEMPLATES;
window.INITIAL_DRUGS = INITIAL_DRUGS;
window.INITIAL_TESTS = INITIAL_TESTS;
window.INITIAL_ADVICE = INITIAL_ADVICE;

// Seed Appointments with dynamic Indian names
const INITIAL_APPOINTMENTS = [
  { id: 'APT-1001', clinicId: 'clinic-1', patientId: 'P-1001', patientName: 'Jayesh Mehta', doctorUsername: 'doctor1', doctorName: 'Dr. Rajesh Iyer', date: '2026-05-27', time: '10:00 AM', type: 'Consultation', status: 'Scheduled', createdBy: 'staff1', createdAt: '2026-05-26T09:00:00Z' },
  { id: 'APT-1002', clinicId: 'clinic-1', patientId: 'P-1002', patientName: 'Ananya Iyer', doctorUsername: 'doctor1', doctorName: 'Dr. Rajesh Iyer', date: '2026-05-27', time: '11:30 AM', type: 'Follow-up', status: 'Checked In', createdBy: 'staff1', createdAt: '2026-05-26T09:30:00Z' },
  { id: 'APT-1003', clinicId: 'clinic-1', patientId: 'P-1001', patientName: 'Jayesh Mehta', doctorUsername: 'doctor2', doctorName: 'Dr. Amit Verma', date: '2026-05-25', time: '02:00 PM', type: 'Procedure', status: 'Completed', createdBy: 'staff1', createdAt: '2026-05-24T14:00:00Z' },
  { id: 'APT-1004', clinicId: 'clinic-1', patientId: 'P-1004', patientName: 'Rahul Dravid', doctorUsername: 'doctor1', doctorName: 'Dr. Rajesh Iyer', date: '2026-05-26', time: '09:30 AM', type: 'Consultation', status: 'Completed', createdBy: 'staff1', createdAt: '2026-05-25T09:00:00Z' },
  { id: 'APT-1005', clinicId: 'clinic-1', patientId: 'P-1005', patientName: 'Kavita Reddy', doctorUsername: 'doctor2', doctorName: 'Dr. Amit Verma', date: '2026-05-26', time: '11:00 AM', type: 'Consultation', status: 'Completed', createdBy: 'staff1', createdAt: '2026-05-25T11:00:00Z' },
  { id: 'APT-1006', clinicId: 'clinic-1', patientId: 'P-1006', patientName: 'Devendra Singh', doctorUsername: 'doctor1', doctorName: 'Dr. Rajesh Iyer', date: '2026-05-27', time: '02:30 PM', type: 'Consultation', status: 'Scheduled', createdBy: 'staff2', createdAt: '2026-05-27T08:30:00Z' },
  { id: 'APT-1007', clinicId: 'clinic-1', patientId: 'P-1007', patientName: 'Meera Deshmukh', doctorUsername: 'doctor2', doctorName: 'Dr. Amit Verma', date: '2026-05-27', time: '03:00 PM', type: 'Procedure', status: 'Scheduled', createdBy: 'staff2', createdAt: '2026-05-27T08:45:00Z' },
  { id: 'APT-1008', clinicId: 'clinic-1', patientId: 'P-1008', patientName: 'Arjun Kapoor', doctorUsername: 'doctor1', doctorName: 'Dr. Rajesh Iyer', date: '2026-05-27', time: '04:00 PM', type: 'Follow-up', status: 'Cancelled', createdBy: 'staff1', createdAt: '2026-05-27T09:00:00Z' },
  { id: 'APT-1009', clinicId: 'clinic-2', patientId: 'P-1003', patientName: 'Vikram Malhotra', doctorUsername: 'doctor3', doctorName: 'Dr. Shalini Gupta', date: '2026-05-27', time: '10:30 AM', type: 'Consultation', status: 'Scheduled', createdBy: 'cadmin2', createdAt: '2026-05-27T09:00:00Z' },
  { id: 'APT-1010', clinicId: 'clinic-2', patientId: 'P-1003', patientName: 'Vikram Malhotra', doctorUsername: 'doctor3', doctorName: 'Dr. Shalini Gupta', date: '2026-05-26', time: '11:00 AM', type: 'Consultation', status: 'Completed', createdBy: 'cadmin2', createdAt: '2026-05-25T15:00:00Z' }
];

// Rich Bills Dataset spanning different dates, payment modes, and doctors
const INITIAL_BILLS = [
  { 
    id: 'INV-1001', 
    clinicId: 'clinic-1', 
    patientId: 'P-1001', 
    patientName: 'Jayesh Mehta', 
    doctorUsername: 'doctor2', 
    doctorName: 'Dr. Amit Verma', 
    items: [{ description: 'ENT Consultation Fee', amount: 500 }, { description: 'Ear Syringing', amount: 800 }], 
    subtotal: 1300, 
    discount: 100, 
    tax: 60, 
    total: 1260, 
    amountPaid: 1260, 
    paymentStatus: 'Paid', 
    paymentMode: 'Cash', 
    createdBy: 'staff1', 
    createdAt: '2026-05-25T14:45:00Z' 
  },
  { 
    id: 'INV-1002', 
    clinicId: 'clinic-1', 
    patientId: 'P-1002', 
    patientName: 'Ananya Iyer', 
    doctorUsername: 'doctor1', 
    doctorName: 'Dr. Rajesh Iyer', 
    items: [{ description: 'General Consultation', amount: 400 }, { description: 'Blood Sugar Test', amount: 150 }], 
    subtotal: 550, 
    discount: 0, 
    tax: 0, 
    total: 550, 
    amountPaid: 0, 
    paymentStatus: 'Pending', 
    paymentMode: 'Insurance', 
    insuranceClaimId: 'CLM-1001', 
    createdBy: 'staff1', 
    createdAt: '2026-05-27T10:15:00Z' 
  },
  { 
    id: 'INV-1003', 
    clinicId: 'clinic-1', 
    patientId: 'P-1004', 
    patientName: 'Rahul Dravid', 
    doctorUsername: 'doctor1', 
    doctorName: 'Dr. Rajesh Iyer', 
    items: [{ description: 'General Consultation', amount: 400 }, { description: 'ECG Test', amount: 600 }], 
    subtotal: 1000, 
    discount: 0, 
    tax: 0, 
    total: 1000, 
    amountPaid: 1000, 
    paymentStatus: 'Paid', 
    paymentMode: 'Card', 
    createdBy: 'staff1', 
    createdAt: '2026-05-26T09:45:00Z' 
  },
  { 
    id: 'INV-1004', 
    clinicId: 'clinic-1', 
    patientId: 'P-1005', 
    patientName: 'Kavita Reddy', 
    doctorUsername: 'doctor2', 
    doctorName: 'Dr. Amit Verma', 
    items: [{ description: 'ENT Consultation Fee', amount: 500 }, { description: 'Nasal Endoscopy', amount: 1500 }], 
    subtotal: 2000, 
    discount: 0, 
    tax: 0, 
    total: 2000, 
    amountPaid: 2000, 
    paymentStatus: 'Paid', 
    paymentMode: 'UPI', 
    createdBy: 'staff1', 
    createdAt: '2026-05-26T11:20:00Z' 
  },
  { 
    id: 'INV-1005', 
    clinicId: 'clinic-1', 
    patientId: 'P-1006', 
    patientName: 'Devendra Singh', 
    doctorUsername: 'doctor1', 
    doctorName: 'Dr. Rajesh Iyer', 
    items: [{ description: 'Senior Consultation', amount: 500 }, { description: 'CBC Blood Panel', amount: 800 }], 
    subtotal: 1300, 
    discount: 0, 
    tax: 0, 
    total: 1300, 
    amountPaid: 1300, 
    paymentStatus: 'Paid', 
    paymentMode: 'Cash', 
    createdBy: 'staff2', 
    createdAt: '2026-05-27T13:00:00Z' 
  },
  { 
    id: 'INV-1006', 
    clinicId: 'clinic-1', 
    patientId: 'P-1007', 
    patientName: 'Meera Deshmukh', 
    doctorUsername: 'doctor2', 
    doctorName: 'Dr. Amit Verma', 
    items: [{ description: 'ENT Consultation Fee', amount: 500 }], 
    subtotal: 500, 
    discount: 0, 
    tax: 0, 
    total: 500, 
    amountPaid: 0, 
    paymentStatus: 'Pending', 
    paymentMode: 'UPI', 
    createdBy: 'staff2', 
    createdAt: '2026-05-27T14:30:00Z' 
  },
  { 
    id: 'INV-1007', 
    clinicId: 'clinic-1', 
    patientId: 'P-1002', 
    patientName: 'Ananya Iyer', 
    doctorUsername: 'doctor1', 
    doctorName: 'Dr. Rajesh Iyer', 
    items: [{ description: 'General Consultation', amount: 400 }], 
    subtotal: 400, 
    discount: 0, 
    tax: 0, 
    total: 400, 
    amountPaid: 400, 
    paymentStatus: 'Paid', 
    paymentMode: 'Card', 
    createdBy: 'staff1', 
    createdAt: '2026-04-15T10:00:00Z' 
  },
  { 
    id: 'INV-1008', 
    clinicId: 'clinic-1', 
    patientId: 'P-1001', 
    patientName: 'Jayesh Mehta', 
    doctorUsername: 'doctor1', 
    doctorName: 'Dr. Rajesh Iyer', 
    items: [{ description: 'General Consultation', amount: 400 }, { description: 'Blood Test', amount: 300 }], 
    subtotal: 700, 
    discount: 0, 
    tax: 0, 
    total: 700, 
    amountPaid: 700, 
    paymentStatus: 'Paid', 
    paymentMode: 'UPI', 
    createdBy: 'staff1', 
    createdAt: '2025-12-10T11:00:00Z' 
  }
];

const INITIAL_INSURANCE = [
  { id: 'INS-1001', clinicId: 'clinic-1', patientId: 'P-1002', provider: 'Star Health Insurance', policyNumber: 'SH-9837482-A', coverageAmount: 50000, claimId: 'CLM-1001', claimAmount: 550, claimStatus: 'Pending Approval', updatedAt: '2026-05-27T10:15:00Z' }
];

const INITIAL_ATTENDANCE = [
  { id: 'ATT-1001', clinicId: 'clinic-1', username: 'staff1', name: 'Nurse Sunita Nair', loginTime: '2026-05-26T08:00:00Z', logoutTime: '2026-05-26T16:30:00Z', date: '2026-05-26' },
  { id: 'ATT-1002', clinicId: 'clinic-1', username: 'staff1', name: 'Nurse Sunita Nair', loginTime: '2026-05-27T08:00:00Z', logoutTime: null, date: '2026-05-27' },
  { id: 'ATT-1003', clinicId: 'clinic-1', username: 'staff2', name: 'Amit Patel', loginTime: '2026-05-27T09:00:00Z', logoutTime: '2026-05-27T17:00:00Z', date: '2026-05-27' }
];

window.INITIAL_APPOINTMENTS = INITIAL_APPOINTMENTS;
window.INITIAL_BILLS = INITIAL_BILLS;
window.INITIAL_INSURANCE = INITIAL_INSURANCE;
window.INITIAL_ATTENDANCE = INITIAL_ATTENDANCE;

// Doctor appointment slot configurations (set by Clinic Admin)
const INITIAL_DOCTOR_SLOTS = [
  {
    doctorUsername: 'doctor1',
    clinicId: 'clinic-1',
    slotDuration: 30, // minutes
    workDays: ['Mon','Tue','Wed','Thu','Fri'],
    sessions: [
      { label: 'Morning', start: '09:00', end: '13:00' },
      { label: 'Evening', start: '17:00', end: '20:00' }
    ]
  },
  {
    doctorUsername: 'doctor2',
    clinicId: 'clinic-1',
    slotDuration: 30,
    workDays: ['Mon','Tue','Wed','Thu','Fri','Sat'],
    sessions: [
      { label: 'Morning', start: '10:00', end: '14:00' }
    ]
  },
  {
    doctorUsername: 'doctor3',
    clinicId: 'clinic-2',
    slotDuration: 30,
    workDays: ['Mon','Tue','Wed','Thu','Fri','Sat'],
    sessions: [
      { label: 'Morning', start: '09:30', end: '13:30' },
      { label: 'Afternoon', start: '15:00', end: '19:00' }
    ]
  }
];

// Portal patient accounts (self-registered via landing page — separate from clinic patient records)
const INITIAL_PATIENT_ACCOUNTS = [];

window.INITIAL_DOCTOR_SLOTS = INITIAL_DOCTOR_SLOTS;
window.INITIAL_PATIENT_ACCOUNTS = INITIAL_PATIENT_ACCOUNTS;
