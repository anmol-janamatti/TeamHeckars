import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // ─── Clean existing data ────────────────────────────────
  await prisma.medicalRecord.deleteMany();
  await prisma.otp.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.doctor.deleteMany();

  // ─── Create Patients ────────────────────────────────────
  const patient1 = await prisma.patient.create({
    data: {
      name: 'Aarav Sharma',
      phoneNumber: '+919876543210',
      age: 45,
      gender: 'Male',
    },
  });

  const patient2 = await prisma.patient.create({
    data: {
      name: 'Priya Patel',
      phoneNumber: '+919876543211',
      age: 32,
      gender: 'Female',
    },
  });

  console.log('✅ Created 2 patients');

  // ─── Create Doctors ─────────────────────────────────────
  const hashedPassword = await bcrypt.hash('doctor123', 12);

  const doctor1 = await prisma.doctor.create({
    data: {
      name: 'Dr. Rajesh Kumar',
      hospitalName: 'Apollo Hospital',
      email: 'rajesh@apollo.com',
      password: hashedPassword,
    },
  });

  const doctor2 = await prisma.doctor.create({
    data: {
      name: 'Dr. Meera Singh',
      hospitalName: 'Fortis Healthcare',
      email: 'meera@fortis.com',
      password: hashedPassword,
    },
  });

  console.log('✅ Created 2 doctors (password: doctor123)');

  // ─── Create Medical Records ─────────────────────────────
  const records = [
    {
      patientId: patient1.id,
      doctorId: doctor1.id,
      diagnosis: 'Type 2 Diabetes Mellitus',
      medications: ['Metformin 500mg', 'Glimepiride 2mg'],
      allergies: ['Penicillin', 'Sulfa drugs'],
      notes: 'Patient has controlled blood sugar levels. HbA1c: 6.8%. Continue current medications. Follow up in 3 months.',
    },
    {
      patientId: patient1.id,
      doctorId: doctor2.id,
      diagnosis: 'Essential Hypertension',
      medications: ['Amlodipine 5mg', 'Losartan 50mg'],
      allergies: ['Penicillin'],
      notes: 'Blood pressure 140/90. Started on dual therapy. Monitor for 2 weeks.',
    },
    {
      patientId: patient2.id,
      doctorId: doctor1.id,
      diagnosis: 'Iron Deficiency Anemia',
      medications: ['Ferrous Sulfate 325mg', 'Vitamin C 500mg'],
      allergies: ['Aspirin'],
      notes: 'Hemoglobin: 9.2 g/dL. Prescribed iron supplementation. Recheck CBC in 6 weeks.',
    },
  ];

  for (const record of records) {
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(record))
      .digest('hex');

    await prisma.medicalRecord.create({
      data: {
        ...record,
        hash,
      },
    });
  }

  console.log('✅ Created 3 medical records with SHA-256 hashes');

  // ─── Summary ────────────────────────────────────────────
  console.log('\n📊 Seed Summary:');
  console.log(`   Patients: ${await prisma.patient.count()}`);
  console.log(`   Doctors: ${await prisma.doctor.count()}`);
  console.log(`   Records: ${await prisma.medicalRecord.count()}`);
  console.log('\n🎉 Seeding complete!\n');

  console.log('─── Test Credentials ───');
  console.log('Doctor 1: rajesh@apollo.com / doctor123');
  console.log('Doctor 2: meera@fortis.com / doctor123');
  console.log(`Patient 1 phone: +919876543210 (ID: ${patient1.id})`);
  console.log(`Patient 2 phone: +919876543211 (ID: ${patient2.id})`);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
