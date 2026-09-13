"use client"

import { cn } from "cn"
import { RESUME_TEMPLATES } from "@/lib/resume-templates"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface TemplateSelectStepProps {
  value: string | null
  onChange: (templateId: string) => void
}

export function TemplateSelectStep({ value, onChange }: TemplateSelectStepProps) {
  return (
    <div className="space-y-4">
      <Alert className="border-primary/20 bg-primary/5">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        <AlertTitle>All templates are proven to be ATS-friendly</AlertTitle>
        <AlertDescription>
          Every template is built to parse cleanly through applicant tracking
          systems and make it past the recruiters who screen them.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {RESUME_TEMPLATES.map((template) => {
          const selected = value === template.id

          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onChange(template.id)}
              aria-pressed={selected}
              className={cn(
                "group relative overflow-hidden rounded-2xl border-2 text-left transition-all",
                selected
                  ? "border-green-500 bg-green-500/5 shadow-lg shadow-green-500/10"
                  : "border-border hover:border-muted-foreground/40 hover:bg-muted/30"
              )}
            >
              <div className="relative overflow-hidden rounded-t-2xl">
                <img
                  src={template.previewImage}
                  alt={`${template.name} template preview`}
                  loading="lazy"
                  className="aspect-[3/4] w-full object-cover object-top"
                />

                {selected && (
                  <div className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-green-500 text-white shadow-md">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-4"
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>

              <div className="p-3">
                <p className="text-sm leading-tighter font-bold">{template.name}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {template.description}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}