import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Initialize App
const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Configure Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `walk-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage });

// Routes

// 1. Get Siblings
app.get('/api/siblings', async (req, res) => {
    const siblings = await prisma.sibling.findMany({ orderBy: { order: 'asc' } });
    res.json(siblings);
});

// 2. Add Sibling
app.post('/api/siblings', async (req, res) => {
    const { name } = req.body;
    const count = await prisma.sibling.count();
    const sibling = await prisma.sibling.create({
        data: { name, order: count }
    });

    // If first sibling, create initial turn
    if (count === 0) {
        await prisma.turn.create({ data: { siblingId: sibling.id } });
    }

    res.json(sibling);
});

// 3. Get Current Turn
app.get('/api/turn/current', async (req, res) => {
    const currentTurn = await prisma.turn.findFirst({
        where: { status: 'CURRENT' },
        include: { sibling: true }
    });

    // Check for any PENDING walks
    const pendingWalk = await prisma.walk.findFirst({
        where: { verificationStatus: 'PENDING' },
        orderBy: { timestamp: 'desc' },
        include: { sibling: true }
    });

    res.json({
        turn: currentTurn,
        pendingVerification: pendingWalk
    });
});

// 4. Submit Walk (Upload)
app.post('/api/walk', upload.single('photo'), async (req, res) => {
    if (!req.file || !req.body.siblingId) return res.status(400).json({ error: 'Missing data' });

    const siblingId = parseInt(req.body.siblingId);

    // Create Walk Record
    const walk = await prisma.walk.create({
        data: {
            siblingId,
            photoPath: `/uploads/${req.file.filename}`,
            verificationStatus: 'PENDING'
        }
    });

    // Trigger Async Verification (Simulated for now, real ML integration next)
    verifyWalk(walk.id, req.file.path);

    res.json(walk);
});

// Real Verification Mock
import { detectDog } from './ml';

async function verifyWalk(walkId: number, filePath: string) {
    console.log(`Starting Async Verification for Walk ${walkId}... (Wait 30s)`);

    // 1. Wait 30s as requested
    setTimeout(async () => {
        try {
            console.log(`Analyzing image for Walk ${walkId}...`);
            const { isDog, score } = await detectDog(filePath);

            console.log(`Verification Result: ${isDog ? 'APPROVED' : 'REJECTED'} (Score: ${score})`);

            await prisma.walk.update({
                where: { id: walkId },
                data: {
                    verificationStatus: isDog ? 'APPROVED' : 'REJECTED',
                    confidenceScore: score
                }
            });

            if (isDog) {
                // Rotate Turn
                const currentTurn = await prisma.turn.findFirst({ where: { status: 'CURRENT' } });
                if (currentTurn) {
                    await prisma.turn.update({ where: { id: currentTurn.id }, data: { status: 'COMPLETED' } });

                    // Find next sibling
                    const allSiblings = await prisma.sibling.findMany({ orderBy: { order: 'asc' } });
                    const currentIndex = allSiblings.findIndex(s => s.id === currentTurn.siblingId);
                    const nextIndex = (currentIndex + 1) % allSiblings.length;
                    const nextSibling = allSiblings[nextIndex];

                    if (nextSibling) {
                        await prisma.turn.create({ data: { siblingId: nextSibling.id } });
                    }
                }
            }
        } catch (err) {
            console.error('Error during verification:', err);
            await prisma.walk.update({
                where: { id: walkId },
                data: { verificationStatus: 'REJECTED' }
            });
        }

    }, 30000); // 30 seconds delay
}

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
