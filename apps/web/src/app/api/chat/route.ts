import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Build the path to the lazynext CLI binary
    // Assuming the web app runs in `apps/web` and we build via cargo at workspace root
    const cliPath = path.resolve(process.cwd(), '../../target/debug/lazynext-cli');
    const dummyProject = path.resolve(process.cwd(), '../../project.json');

    console.log(`Executing Agent CLI: ${cliPath} prompt "${prompt}"`);

    // We pass the prompt to our lazynext-cli
    const { stdout, stderr } = await execAsync(`"${cliPath}" prompt "${dummyProject}" "${prompt}"`, {
      env: {
        ...process.env,
        // Pass down API keys so the CLI can use the dynamically configured agent
      }
    });

    if (stderr && stderr.toLowerCase().includes('error')) {
       console.error("CLI Error:", stderr);
    }

    return NextResponse.json({
      response: stdout,
      logs: stderr
    });
  } catch (error: any) {
    console.error("Agent error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
