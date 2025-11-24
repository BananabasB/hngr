/**
 * Conflict resolution for device synchronization
 * In DS Suitcase mode, conflicts are resolved by complete state replacement
 */

import type { HngrDB } from '../setup';

export interface ConflictResolutionResult {
  resolved: boolean;
  action: 'replace' | 'merge' | 'reject';
  reason?: string;
  originalState?: HngrDB;
  incomingState: HngrDB;
  finalState: HngrDB;
}

export interface ConflictAnalysis {
  hasConflicts: boolean;
  conflictTypes: string[];
  severity: 'none' | 'low' | 'medium' | 'high';
  recommendations: string[];
}

/**
 * Analyze potential conflicts between current and incoming state
 * In DS Suitcase mode, we typically replace completely, but we can warn about data loss
 */
export function analyzeConflicts(currentState: HngrDB | null, incomingState: HngrDB): ConflictAnalysis {
  const conflictTypes: string[] = [];
  const recommendations: string[] = [];

  if (!currentState) {
    // No current state, no conflicts
    return {
      hasConflicts: false,
      conflictTypes: [],
      severity: 'none',
      recommendations: ['Accept incoming state'],
    };
  }

  // Check for tribute count differences
  const currentTributeCount = Object.keys(currentState.tributes).length;
  const incomingTributeCount = Object.keys(incomingState.tributes).length;

  if (currentTributeCount !== incomingTributeCount) {
    conflictTypes.push('tribute_count_mismatch');
    recommendations.push(`Current state has ${currentTributeCount} tributes, incoming has ${incomingTributeCount}`);
  }

  // Check for event count differences
  const currentEventCount = Object.values(currentState.events).reduce((sum, events) => sum + events.length, 0);
  const incomingEventCount = Object.values(incomingState.events).reduce((sum, events) => sum + events.length, 0);

  if (currentEventCount !== incomingEventCount) {
    conflictTypes.push('event_count_mismatch');
    recommendations.push(`Current state has ${currentEventCount} events, incoming has ${incomingEventCount}`);
  }

  // Check for referral name changes
  if (currentState.tributeReferralName.plural !== incomingState.tributeReferralName.plural) {
    conflictTypes.push('referral_name_change');
    recommendations.push(`Referral name will change from '${currentState.tributeReferralName.plural}' to '${incomingState.tributeReferralName.plural}'`);
  }

  // Determine severity
  let severity: ConflictAnalysis['severity'] = 'none';
  if (conflictTypes.length > 0) {
    severity = conflictTypes.length > 2 ? 'high' : conflictTypes.length > 1 ? 'medium' : 'low';
  }

  return {
    hasConflicts: conflictTypes.length > 0,
    conflictTypes,
    severity,
    recommendations,
  };
}

/**
 * Resolve conflicts using DS Suitcase approach (complete replacement)
 * This is the primary resolution strategy for device transfers
 */
export function resolveConflicts(currentState: HngrDB | null, incomingState: HngrDB): ConflictResolutionResult {
  const analysis = analyzeConflicts(currentState, incomingState);

  // In DS Suitcase mode, we always replace the current state
  // But we provide information about what was lost
  return {
    resolved: true,
    action: 'replace',
    reason: 'DS Suitcase mode: Complete state replacement',
    originalState: currentState || undefined,
    incomingState,
    finalState: incomingState,
  };
}

/**
 * Create a backup of current state before replacement
 */
export function createStateBackup(state: HngrDB): HngrDB {
  return {
    tributeReferralName: { ...state.tributeReferralName },
    tributes: Object.fromEntries(
      Object.entries(state.tributes).map(([id, tribute]) => [
        id,
        {
          ...tribute,
          relationships: { ...tribute.relationships },
        },
      ])
    ),
    events: Object.fromEntries(
      Object.entries(state.events).map(([day, events]) => [
        parseInt(day),
        events.map(event => ({ ...event })),
      ])
    ),
  };
}

/**
 * Validate state integrity after transfer
 */
export function validateTransferredState(state: HngrDB): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Basic structure validation
  if (!state.tributeReferralName || typeof state.tributeReferralName.plural !== 'string') {
    errors.push('Invalid tribute referral name structure');
  }

  if (!state.tributes || typeof state.tributes !== 'object') {
    errors.push('Invalid tributes structure');
  }

  if (!state.events || typeof state.events !== 'object') {
    errors.push('Invalid events structure');
  }

  // Validate tribute data
  for (const [id, tribute] of Object.entries(state.tributes)) {
    if (!tribute.name || typeof tribute.name !== 'string') {
      errors.push(`Tribute ${id}: invalid name`);
    }

    if (tribute.district < 1 || tribute.district > 12) {
      errors.push(`Tribute ${id}: invalid district ${tribute.district}`);
    }

    if (typeof tribute.health?.physical !== 'number' || typeof tribute.health?.mental !== 'number') {
      errors.push(`Tribute ${id}: invalid health values`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate conflict resolution report for user feedback
 */
export function generateResolutionReport(result: ConflictResolutionResult, analysis: ConflictAnalysis): string {
  let report = `State transfer completed successfully.\n\n`;

  if (analysis.hasConflicts) {
    report += `Changes detected:\n`;
    analysis.recommendations.forEach(rec => {
      report += `• ${rec}\n`;
    });
    report += `\n`;
  }

  if (result.originalState) {
    const originalTributes = Object.keys(result.originalState.tributes).length;
    const originalEvents = Object.values(result.originalState.events).reduce((sum, events) => sum + events.length, 0);

    report += `Previous state backed up:\n`;
    report += `• ${originalTributes} tributes\n`;
    report += `• ${originalEvents} events\n`;
    report += `• Referral: ${result.originalState.tributeReferralName.plural}\n\n`;
  }

  const newTributes = Object.keys(result.finalState.tributes).length;
  const newEvents = Object.values(result.finalState.events).reduce((sum, events) => sum + events.length, 0);

  report += `New state loaded:\n`;
  report += `• ${newTributes} tributes\n`;
  report += `• ${newEvents} events\n`;
  report += `• Referral: ${result.finalState.tributeReferralName.plural}\n`;

  return report;
}
