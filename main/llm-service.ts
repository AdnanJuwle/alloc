import OpenAI from 'openai';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';

interface Settings {
  openaiApiKey?: string;
  llmEnabled?: boolean;
  llmModel?: string; // 'gpt-3.5-turbo' | 'gpt-4' | 'gpt-4-turbo-preview'
}

function getSettingsPath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'settings.json');
}

function loadSettings(): Settings {
  const settingsPath = getSettingsPath();
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
  return {};
}

function saveSettings(settings: Settings): void {
  const settingsPath = getSettingsPath();
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
}

export function getSettings(): Settings {
  return loadSettings();
}

export function updateSettings(updates: Partial<Settings>): void {
  const current = loadSettings();
  const updated = { ...current, ...updates };
  saveSettings(updated);
}

export function getOpenAIClient(): OpenAI | null {
  const settings = loadSettings();
  if (!settings.openaiApiKey || !settings.llmEnabled) {
    return null;
  }
  
  try {
    return new OpenAI({
      apiKey: settings.openaiApiKey,
    });
  } catch (error) {
    console.error('Error creating OpenAI client:', error);
    return null;
  }
}

export async function getLLMForecastInsights(
  financialData: {
    currentBalance: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    monthlySavings: number;
    goals: Array<{
      name: string;
      currentAmount: number;
      targetAmount: number;
      deadline: string;
      requiredMonthly: number;
      currentMonthly: number;
    }>;
    spendingPatterns: Array<{
      categoryName: string;
      averageMonthly: number;
      trend: string;
    }>;
    monthsAhead: number;
  }
): Promise<{
  insights: string[];
  recommendations: string[];
  risks: string[];
  opportunities: string[];
} | null> {
  const client = getOpenAIClient();
  if (!client) {
    return null;
  }

  try {
    const prompt = `You are a financial advisor analyzing a personal finance forecast. Provide concise, actionable insights.

Financial Summary:
- Current Balance: ₹${financialData.currentBalance.toLocaleString()}
- Monthly Income: ₹${financialData.monthlyIncome.toLocaleString()}
- Monthly Expenses: ₹${financialData.monthlyExpenses.toLocaleString()}
- Monthly Savings: ₹${financialData.monthlySavings.toLocaleString()}
- Forecast Period: ${financialData.monthsAhead} months ahead

Goals:
${financialData.goals.map(g => `- ${g.name}: ₹${g.currentAmount.toLocaleString()}/₹${g.targetAmount.toLocaleString()} (Need ₹${g.requiredMonthly.toLocaleString()}/month, currently saving ₹${g.currentMonthly.toLocaleString()}/month, deadline: ${new Date(g.deadline).toLocaleDateString()})`).join('\n')}

Spending Patterns:
${financialData.spendingPatterns.map(p => `- ${p.categoryName}: ₹${p.averageMonthly.toLocaleString()}/month (${p.trend} trend)`).join('\n')}

Provide a JSON response with exactly this structure:
{
  "insights": ["insight 1", "insight 2", "insight 3"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "risks": ["risk 1", "risk 2"],
  "opportunities": ["opportunity 1", "opportunity 2"]
}

Keep each item concise (1-2 sentences max). Focus on actionable advice.`;

    const response = await client.chat.completions.create({
      model: loadSettings().llmModel || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a financial advisor. Provide structured, actionable financial insights in JSON format.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return null;
    }

    // Try to parse JSON from the response
    try {
      // Sometimes the response might have markdown code blocks
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      const parsed = JSON.parse(jsonString.trim());
      
      return {
        insights: parsed.insights || [],
        recommendations: parsed.recommendations || [],
        risks: parsed.risks || [],
        opportunities: parsed.opportunities || [],
      };
    } catch (parseError) {
      console.error('Error parsing LLM response:', parseError);
      // Fallback: try to extract structured data from text
      return {
        insights: [content.substring(0, 500)],
        recommendations: [],
        risks: [],
        opportunities: [],
      };
    }
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return null;
  }
}

export async function getLLMScenarioAnalysis(
  scenario: {
    name: string;
    type: string;
    description: string;
    amount: number;
    impact: {
      projectedBalance: number;
      monthlySavingsChange: number;
      affectedGoals: Array<{ goalName: string; completionDateShift: number }>;
    };
  }
): Promise<string | null> {
  const client = getOpenAIClient();
  if (!client) {
    return null;
  }

  try {
    const prompt = `Analyze this financial scenario and provide a brief assessment (2-3 sentences):

Scenario: ${scenario.name}
Type: ${scenario.type}
Description: ${scenario.description}
Amount: ₹${scenario.amount.toLocaleString()}

Impact:
- Projected Balance: ₹${scenario.impact.projectedBalance.toLocaleString()}
- Monthly Savings Change: ₹${scenario.impact.monthlySavingsChange.toLocaleString()}
- Affected Goals: ${scenario.impact.affectedGoals.map(g => `${g.goalName} (${g.completionDateShift > 0 ? `+${g.completionDateShift} months delay` : 'no delay'})`).join(', ')}

Provide a concise analysis focusing on whether this scenario is advisable and its long-term implications.`;

    const response = await client.chat.completions.create({
      model: loadSettings().llmModel || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a financial advisor. Provide concise, practical financial analysis.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    return response.choices[0]?.message?.content || null;
  } catch (error) {
    console.error('Error calling OpenAI API for scenario:', error);
    return null;
  }
}

