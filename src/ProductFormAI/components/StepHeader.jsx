// File: src/ProductFormAI/components/StepHeader.jsx

import React from "react";
import { CheckCircle } from "lucide-react";

export default function StepHeader({ step, title, done, subtitle }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900 text-sm font-bold text-white">
            {step}
          </div>
          <div className="text-base font-semibold text-zinc-900">{title}</div>
          {done ? <CheckCircle className="h-5 w-5 text-emerald-600" /> : null}
        </div>
        {subtitle ? <div className="mt-1 text-xs text-zinc-500">{subtitle}</div> : null}
      </div>
    </div>
  );
}
