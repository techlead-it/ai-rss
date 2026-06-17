/** Workers AI の Neuron 日次上限到達を表すエラー。到達時は収集を打ち切り正常終了する。 */
export class NeuronLimitError extends Error {
  constructor(message = "Workers AI Neuron daily limit reached") {
    super(message);
    this.name = "NeuronLimitError";
  }
}

const LIMIT_PATTERN = /neuron|allocation|capacity|exceeded|too many requests|\b429\b|\b3040\b/i;

/** AI 呼び出しの失敗メッセージが Neuron 上限/レート由来かを判定する。 */
export function isNeuronLimitError(err: unknown): boolean {
  if (err instanceof NeuronLimitError) return true;
  const message = err instanceof Error ? err.message : String(err);
  return LIMIT_PATTERN.test(message);
}
