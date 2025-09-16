import type { Deal, Contact, ScoringResult, ScoringFactors, Priority, RiskLevel } from './types';

/**
 * Sistema de Scoring Inteligente para MindLab Pulse CRM
 * 
 * Calcula scores de 0-100 y prioridades (Cold/Warm/Hot) basado en:
 * - Probabilidad de cierre
 * - Valor del deal
 * - Actividad reciente
 * - Tiempo en etapa actual
 * - Historial de interacciones
 */

// Configuración de pesos para el scoring (optimizada)
const SCORING_WEIGHTS = {
  probability: 0.35,   // 35% - Probabilidad de cierre (más peso)
  amount: 0.25,        // 25% - Valor monetario
  activity: 0.25,      // 25% - Actividad reciente (más peso)
  stage: 0.10,         // 10% - Etapa del pipeline (menos peso)
  timeInStage: 0.05,   // 5% - Tiempo en etapa actual (menos peso)
} as const;

// Configuración de etapas del pipeline (orden de importancia)
const PIPELINE_STAGES = {
  'Prospección': 1,
  'Calificación': 2,
  'Propuesta': 3,
  'Negociación': 4,
  'Cierre': 5,
} as const;

// Umbrales para prioridades
const PRIORITY_THRESHOLDS = {
  Hot: 75,
  Warm: 45,
  Cold: 0,
} as const;

// Umbrales para niveles de riesgo
const RISK_THRESHOLDS = {
  Alto: 7,    // 7+ días de inactividad o fecha vencida
  Medio: 3,   // 3-6 días de inactividad
  Bajo: 0,    // 0-2 días de inactividad
} as const;

/**
 * Calcula el score de un deal basado en múltiples factores
 */
export function calculateDealScore(deal: Deal): ScoringResult {
  const factors = calculateDealFactors(deal);
  const score = calculateWeightedScore(factors);
  const priority = determinePriority(score);
  const reasoning = generateDealReasoning(deal, factors, score);

  return {
    score: Math.round(score),
    priority,
    factors,
    reasoning,
  };
}

/**
 * Calcula el score de un contacto basado en su actividad y deals asociados
 */
export function calculateContactScore(contact: Contact, deals: Deal[] = []): ScoringResult {
  const factors = calculateContactFactors(contact, deals);
  const score = calculateWeightedScore(factors);
  const priority = determinePriority(score);
  const reasoning = generateContactReasoning(contact, factors, score);

  return {
    score: Math.round(score),
    priority,
    factors,
    reasoning,
  };
}

/**
 * Calcula los factores de scoring para un deal
 */
function calculateDealFactors(deal: Deal): ScoringFactors {
  const now = new Date();
  const createdDate = new Date(deal.created_at);
  const lastActivity = deal.last_activity ? new Date(deal.last_activity) : createdDate;
  const targetCloseDate = deal.target_close_date ? new Date(deal.target_close_date) : null;

  // Factor de probabilidad (0-100)
  const probability = Math.min(deal.probability || 0, 100);

  // Factor de monto (normalizado 0-100)
  const amount = normalizeAmount(deal.amount || 0);

  // Factor de actividad (0-100)
  const activity = calculateActivityScore(lastActivity, now);

  // Factor de etapa (0-100)
  const stage = calculateStageScore(deal.stage);

  // Factor de tiempo en etapa (0-100)
  const timeInStage = calculateTimeInStageScore(createdDate, now, deal.stage);

  // Factor de última actividad (0-100)
  const lastActivityScore = calculateLastActivityScore(lastActivity, now);

  return {
    probability,
    amount,
    activity,
    stage,
    timeInStage,
    lastActivity: lastActivityScore,
  };
}

/**
 * Calcula los factores de scoring para un contacto
 */
function calculateContactFactors(contact: Contact, deals: Deal[]): ScoringFactors {
  const now = new Date();
  const lastActivity = contact.last_activity ? new Date(contact.last_activity) : new Date(contact.created_at);

  // Factor de probabilidad basado en deals asociados
  const avgProbability = deals.length > 0 
    ? deals.reduce((sum, deal) => sum + (deal.probability || 0), 0) / deals.length
    : 0;

  // Factor de monto basado en valor total de deals
  const totalAmount = deals.reduce((sum, deal) => sum + (deal.amount || 0), 0);
  const amount = normalizeAmount(totalAmount);

  // Factor de actividad
  const activity = calculateActivityScore(lastActivity, now);

  // Factor de etapa basado en el deal más avanzado
  const maxStage = deals.length > 0 
    ? Math.max(...deals.map(deal => PIPELINE_STAGES[deal.stage as keyof typeof PIPELINE_STAGES] || 1))
    : 1;
  const stage = (maxStage / 5) * 100;

  // Factor de tiempo en etapa (basado en el deal más antiguo)
  const oldestDeal = deals.length > 0 
    ? deals.reduce((oldest, deal) => 
        new Date(deal.created_at) < new Date(oldest.created_at) ? deal : oldest
      )
    : null;
  const timeInStage = oldestDeal 
    ? calculateTimeInStageScore(new Date(oldestDeal.created_at), now, oldestDeal.stage)
    : 0;

  // Factor de última actividad
  const lastActivityScore = calculateLastActivityScore(lastActivity, now);

  return {
    probability: avgProbability,
    amount,
    activity,
    stage,
    timeInStage,
    lastActivity: lastActivityScore,
  };
}

/**
 * Calcula el score ponderado final
 */
function calculateWeightedScore(factors: ScoringFactors): number {
  return (
    factors.probability * SCORING_WEIGHTS.probability +
    factors.amount * SCORING_WEIGHTS.amount +
    factors.activity * SCORING_WEIGHTS.activity +
    factors.stage * SCORING_WEIGHTS.stage +
    factors.timeInStage * SCORING_WEIGHTS.timeInStage
  );
}

/**
 * Determina la prioridad basada en el score
 */
export function determinePriority(score: number): Priority {
  if (score >= PRIORITY_THRESHOLDS.Hot) return 'Hot';
  if (score >= PRIORITY_THRESHOLDS.Warm) return 'Warm';
  return 'Cold';
}

/**
 * Calcula el nivel de riesgo de un deal
 */
export function calculateRiskLevel(deal: Deal): RiskLevel {
  const now = new Date();
  const lastActivity = deal.last_activity ? new Date(deal.last_activity) : new Date(deal.created_at);
  const targetCloseDate = deal.target_close_date ? new Date(deal.target_close_date) : null;

  let riskScore = 0;

  // Inactividad
  const daysSinceActivity = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
  if (daysSinceActivity >= 14) riskScore += 3;
  else if (daysSinceActivity >= 7) riskScore += 2;
  else if (daysSinceActivity >= 3) riskScore += 1;

  // Fecha de cierre vencida
  if (targetCloseDate && targetCloseDate < now) riskScore += 3;

  // Sin próximo paso
  if (!deal.next_step) riskScore += 2;

  // Probabilidad baja
  if ((deal.probability || 0) < 30) riskScore += 1;

  // Sin actividad reciente
  if (daysSinceActivity > 7) riskScore += 1;

  if (riskScore >= RISK_THRESHOLDS.Alto) return 'Alto';
  if (riskScore >= RISK_THRESHOLDS.Medio) return 'Medio';
  return 'Bajo';
}

// Funciones auxiliares

function normalizeAmount(amount: number): number {
  // Normaliza el monto a una escala de 0-100 (optimizada)
  // Montos típicos: 0-5k = 0-20, 5k-25k = 20-50, 25k-75k = 50-75, 75k+ = 75-100
  if (amount === 0) return 0;
  if (amount < 5000) return Math.min((amount / 5000) * 20, 20);
  if (amount < 25000) return 20 + ((amount - 5000) / 20000) * 30;
  if (amount < 75000) return 50 + ((amount - 25000) / 50000) * 25;
  return Math.min(75 + ((amount - 75000) / 75000) * 25, 100);
}

function calculateActivityScore(lastActivity: Date, now: Date): number {
  const daysSinceActivity = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysSinceActivity === 0) return 100; // Hoy
  if (daysSinceActivity === 1) return 90;  // Ayer
  if (daysSinceActivity <= 3) return 80;   // Esta semana
  if (daysSinceActivity <= 7) return 60;   // Última semana
  if (daysSinceActivity <= 14) return 40;  // Últimas 2 semanas
  if (daysSinceActivity <= 30) return 20;  // Último mes
  return 0; // Más de un mes
}

function calculateStageScore(stage: string): number {
  const stageValue = PIPELINE_STAGES[stage as keyof typeof PIPELINE_STAGES] || 1;
  return (stageValue / 5) * 100;
}

function calculateTimeInStageScore(createdDate: Date, now: Date, stage: string): number {
  const daysInStage = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
  const stageValue = PIPELINE_STAGES[stage as keyof typeof PIPELINE_STAGES] || 1;
  
  // Etapas tempranas pueden estar más tiempo, etapas avanzadas menos
  const maxDays = stageValue === 1 ? 30 : stageValue === 2 ? 21 : stageValue === 3 ? 14 : 7;
  
  if (daysInStage <= maxDays / 3) return 100; // Recién llegado
  if (daysInStage <= maxDays * 2 / 3) return 70; // Tiempo normal
  if (daysInStage <= maxDays) return 40; // Tiempo límite
  return Math.max(0, 40 - (daysInStage - maxDays) * 5); // Penalización por exceso
}

function calculateLastActivityScore(lastActivity: Date, now: Date): number {
  const daysSinceActivity = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, 100 - daysSinceActivity * 5);
}

function generateDealReasoning(deal: Deal, factors: ScoringFactors, score: number): string[] {
  const reasoning: string[] = [];
  
  if (factors.probability > 70) reasoning.push(`Alta probabilidad de cierre (${factors.probability}%)`);
  if (factors.amount > 60) reasoning.push(`Deal de alto valor`);
  if (factors.activity > 80) reasoning.push(`Actividad reciente`);
  if (factors.stage > 60) reasoning.push(`Etapa avanzada del pipeline`);
  
  if (score < 30) reasoning.push(`Score bajo - requiere atención`);
  if (score > 80) reasoning.push(`Deal prioritario - alta probabilidad de éxito`);
  
  return reasoning;
}

function generateContactReasoning(contact: Contact, factors: ScoringFactors, score: number): string[] {
  const reasoning: string[] = [];
  
  if (factors.amount > 60) reasoning.push(`Contacto de alto valor`);
  if (factors.activity > 80) reasoning.push(`Actividad reciente`);
  if (factors.stage > 60) reasoning.push(`Deals en etapas avanzadas`);
  
  if (score < 30) reasoning.push(`Contacto frío - necesita reactivación`);
  if (score > 80) reasoning.push(`Contacto caliente - alta prioridad`);
  
  return reasoning;
}

/**
 * Recalcula scores para todos los deals y contactos
 * Esta función se puede llamar periódicamente para mantener scores actualizados
 */
export async function recalculateAllScores(
  deals: Deal[],
  contacts: Contact[]
): Promise<{ deals: Deal[]; contacts: Contact[] }> {
  const updatedDeals = deals.map(deal => {
    const scoringResult = calculateDealScore(deal);
    const riskLevel = calculateRiskLevel(deal);
    
    return {
      ...deal,
      score: scoringResult.score,
      priority: scoringResult.priority,
      risk_level: riskLevel,
    };
  });

  const updatedContacts = contacts.map(contact => {
    const contactDeals = deals.filter(deal => deal.contact_id === contact.id);
    const scoringResult = calculateContactScore(contact, contactDeals);
    
    return {
      ...contact,
      score: scoringResult.score,
      priority: scoringResult.priority,
    };
  });

  return { deals: updatedDeals, contacts: updatedContacts };
}