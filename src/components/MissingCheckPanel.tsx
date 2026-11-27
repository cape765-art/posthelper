import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  PlusCircle,
  XCircle,
} from 'lucide-react';
import {
  AiAuditFinding,
  AiAuditFixAction,
  AiAuditResult,
  AuditStatus,
  DeterministicCheckItem,
} from '../types/post';

interface MissingCheckPanelProps {
  checks: DeterministicCheckItem[];
  onQuickAction: (item: DeterministicCheckItem) => void;
  aiAudit: AiAuditResult | null;
  aiReminders: string[];
  onRunAiAudit: () => void;
  isAuditing: boolean;
  onApplyAiFix: (fix: AiAuditFixAction) => void;
}

function StatusBadge({ status, label }: { status: AuditStatus; label: string }) {
  if (status === 'pass') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 whitespace-nowrap shrink-0">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        <span>{label}</span>
      </span>
    );
  }
  if (status === 'warning') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 whitespace-nowrap shrink-0">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
        <span>{label}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 whitespace-nowrap shrink-0">
      <XCircle className="w-3.5 h-3.5 text-red-600" />
      <span>{label}</span>
    </span>
  );
}

export const MissingCheckPanel: React.FC<MissingCheckPanelProps> = ({
  checks,
  onQuickAction,
  aiAudit,
  aiReminders,
  onRunAiAudit,
  isAuditing,
  onApplyAiFix,
}) => {
  const passedCount = checks.filter((c) => c.status === 'pass').length;
  const missingCount = checks.filter((c) => c.status === 'missing').length;
  const warningCount = checks.filter((c) => c.status === 'warning').length;

  return (
    <section
      id="step-audit"
      className="bg-white border border-slate-200 rounded-xl p-6 scroll-mt-20"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-900">
            04. 發布前檢查：還有缺漏甚麼？
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1 tabular-nums">
            <span className="font-medium text-slate-800">
              {passedCount} / {checks.length} 項已就緒
            </span>
            <span aria-hidden="true">·</span>
            <span className={missingCount > 0 ? 'text-red-600 font-medium' : ''}>
              {missingCount} 項缺漏
            </span>
            <span aria-hidden="true">·</span>
            <span className={warningCount > 0 ? 'text-amber-700 font-medium' : ''}>
              {warningCount} 項建議補強
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onRunAiAudit}
          disabled={isAuditing}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:bg-slate-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {isAuditing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>AI 深度健檢中...</span>
            </>
          ) : (
            <>
              <ClipboardCheck className="w-4 h-4" />
              <span>AI 深度比對圖文缺漏</span>
            </>
          )}
        </button>
      </div>

      {/* Deterministic real-time checklist */}
      <div className="mt-4 divide-y divide-slate-100">
        {checks.map((item) => (
          <div
            key={item.id}
            className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
          >
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-900">{item.title}</span>
                <StatusBadge status={item.status} label={item.statusLabel} />
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{item.detail}</p>
            </div>

            {item.actionLabel && item.status !== 'pass' && (
              <button
                type="button"
                onClick={() => onQuickAction(item)}
                className="self-start sm:self-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {item.actionLabel}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Initial AI generation missing reminders if present and no full audit run yet */}
      {!aiAudit && aiReminders.length > 0 && (
        <div className="mt-5 pt-4 border-t border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900 mb-2.5">
            AI 貼文生成時發現的待補細節
          </h3>
          <ul className="space-y-2">
            {aiReminders.map((tip, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200/80 rounded-lg px-3.5 py-2.5"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Deep AI圖文比對結果 */}
      {aiAudit && (
        <div className="mt-5 pt-5 border-t border-slate-200 space-y-4">
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-xs font-semibold text-slate-700 mb-1">
              AI 深度圖文比對總結
            </div>
            <p className="text-sm text-slate-900 leading-relaxed">{aiAudit.summary}</p>
          </div>

          <div className="divide-y divide-slate-100">
            {aiAudit.findings.map((finding: AiAuditFinding, index: number) => {
              const statusText =
                finding.status === 'pass'
                  ? '檢查通過'
                  : finding.status === 'warning'
                    ? '建議補充'
                    : '明顯缺漏';
              return (
                <div
                  key={`${finding.area}-${index}`}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-slate-500">
                        {finding.area}
                      </span>
                      <span aria-hidden="true" className="text-slate-300">
                        /
                      </span>
                      <span className="text-sm font-medium text-slate-900">
                        {finding.title}
                      </span>
                      <StatusBadge status={finding.status} label={statusText} />
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {finding.advice}
                    </p>
                  </div>

                  {finding.fixAction && (
                    <button
                      type="button"
                      onClick={() => onApplyAiFix(finding.fixAction!)}
                      className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>{finding.fixAction.label}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
