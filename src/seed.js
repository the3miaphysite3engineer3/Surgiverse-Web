import { collection, addDoc } from "firebase/firestore";
import { db } from "./firebase.js";

const mockSurgeries = [
  {
    title: "Grommet insertion (myringotomy)",
    category: "ENT (Ear, Nose, Throat)",
    description: "Incise the tympanic membrane and insert a pressure equalization tube.",
    defaultMetrics: {
      maxBleedingLevel: 1,
      requiredSuctionPower: 1,
      safeZone: "Antero-Inferior Quadrant",
      targetTimeSeconds: 300,
    },
    requiredSteps: [
      "Ear canal clearance",
      "Myringotomy incision",
      "Middle ear fluid aspiration",
      "Tube (Grommet) placement",
      "Final inspection",
    ],
    sceneName: "MainScene",
    viewSceneName: "EarNavigation",
  },
  {
    title: 'Appendicectomy',
    category: 'General Surgery',
    description: 'Emergency surgery to remove the appendix of an adult patient.',
    patientInfo: {
      name: 'Jane Smith',
      age: 32,
      gender: 'Female',
    },
    date: '2023-11-15',
    duration: '45 minutes',
    surgeons: ['Dr. Robert Brown'],
    metrics: {
      bloodLoss: '20ml',
      complications: 'Minor infection at incision site',
      outcome: 'Good',
    },
  },
  {
    title: 'Coronary artery bypass',
    category: 'Cardiothoracic',
    description: 'A major operation to improve blood flow to the heart of an elderly patient.',
    patientInfo: {
      name: 'Richard Johnson',
      age: 68,
      gender: 'Male',
    },
    date: '2023-12-01',
    duration: '4 hours',
    surgeons: ['Dr. Sarah Lee', 'Dr. Michael Chen'],
    metrics: {
      bloodLoss: '300ml',
      complications: 'None',
      outcome: 'Excellent',
    },
  },
  {
    title: 'Knee replacement',
    category: 'Orthopaedic',
    description: 'A procedure to replace a damaged knee joint in an active, middle-aged patient.',
    patientInfo: {
      name: 'Mary Williams',
      age: 55,
      gender: 'Female',
    },
    date: '2024-01-10',
    duration: '2 hours',
    surgeons: ['Dr. David Wilson'],
    metrics: {
      bloodLoss: '150ml',
      complications: 'None',
      outcome: 'Very Good',
    },
  },
];

const seedDatabase = async () => {
  const surgeriesCollection = collection(db, "surgeries");
  for (const surgery of mockSurgeries) {
    await addDoc(surgeriesCollection, surgery);
  }
  console.log("Database seeded successfully!");
};

seedDatabase();
