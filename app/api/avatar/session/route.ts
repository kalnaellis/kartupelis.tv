import { NextResponse } from 'next/server';
import Runway from '@runwayml/sdk';

export async function POST(req: Request) {
  const { avatarId, personality, startScript } = await req.json();
  const client = new Runway({ apiKey: process.env.RUNWAYML_API_SECRET! });

  const session = await client.realtimeSessions.create({
    model: 'gwm1_avatars',
    avatar: { type: 'custom', avatarId },
    personality,
    startScript,
  });

  let attempts = 0;
  let info = await client.realtimeSessions.get({ id: session.id });

  while (info.status !== 'ready' && attempts < 20) {
    await new Promise((r) => setTimeout(r, 1500));
    info = await client.realtimeSessions.get({ id: session.id });
    attempts++;
  }

  const connection = info.connections?.[0];
  return NextResponse.json({ credentials: connection?.credentials });
}
