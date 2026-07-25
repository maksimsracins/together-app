import OpenAI from 'openai';
import { GenerateReportRequest, GenerateReportResponse } from './types';
import { buildUserPrompt, REPORT_JSON_SCHEMA, SYSTEM_PROMPT } from './prompt';

let client: OpenAI | null = null;
function getClient() {
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

export async function generateWeeklyReport(req: GenerateReportRequest): Promise<GenerateReportResponse> {
  const completion = await getClient().chat.completions.create({
    model: MODEL,
    temperature: 0.7,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(req) },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: REPORT_JSON_SCHEMA,
    },
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error('Empty response from OpenAI');

  return JSON.parse(raw) as GenerateReportResponse;
}
