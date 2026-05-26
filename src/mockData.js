const INITIAL_CLINICS = [
  { id: 'clinic-1', name: 'City Health Clinic', subscription: 'Active', logoUrl: '' },
  { id: 'clinic-2', name: 'Metro Dental Care', subscription: 'Active', logoUrl: '' }
];

const INITIAL_USERS = [
  // Super Admin
  { username: 'admin', password: 'password', role: 'admin', clinicId: null, name: 'Super Administrator' },
  // Clinic 1 Admin
  { username: 'cadmin1', password: 'password', role: 'clinic_admin', clinicId: 'clinic-1', name: 'Alice Smith (Manager)' },
  // Clinic 2 Admin
  { username: 'cadmin2', password: 'password', role: 'clinic_admin', clinicId: 'clinic-2', name: 'Bob Johnson (Manager)' },
  // Clinic 1 Staff
  { username: 'staff1', password: 'password', role: 'staff', clinicId: 'clinic-1', name: 'Nurse Sarah Jenkins' },
  // Clinic 1 Doctors
  { 
    username: 'doctor1', 
    password: 'password', 
    role: 'doctor', 
    clinicId: 'clinic-1', 
    name: 'Dr. Evelyn Martinez', 
    qualification: 'MD, FACP (Internal Medicine)', 
    designation: 'Senior Consultant Physician' 
  },
  { 
    username: 'doctor2', 
    password: 'password', 
    role: 'doctor', 
    clinicId: 'clinic-1', 
    name: 'Dr. Kenji Sato', 
    qualification: 'MBBS, DLO (Otolaryngology)', 
    designation: 'ENT Specialist' 
  },
  // Clinic 2 Doctor
  { 
    username: 'doctor3', 
    password: 'password', 
    role: 'doctor', 
    clinicId: 'clinic-2', 
    name: 'Dr. Clara Oswald', 
    qualification: 'DDS, Cosmetic Dentistry', 
    designation: 'Lead Dental Practitioner' 
  }
];

const INITIAL_PATIENTS = [
  { id: 'P-1001', clinicId: 'clinic-1', name: 'Jonathan Vance', age: 42, gender: 'Male', mobile: '9876543210', registeredAt: '2026-05-20' },
  { id: 'P-1002', clinicId: 'clinic-1', name: 'Elizabeth Miller', age: 29, gender: 'Female', mobile: '9876543211', registeredAt: '2026-05-22' },
  { id: 'P-1003', clinicId: 'clinic-2', name: 'Thomas Wayne', age: 55, gender: 'Male', mobile: '9876543212', registeredAt: '2026-05-24' }
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
  // Dr. Evelyn Martinez (doctor1)
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

  // Dr. Kenji Sato (doctor2)
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
