"use client";

import { useState } from "react";
import { Ruler, ChevronDown, ChevronUp, Info } from "lucide-react";
import type { MeasurementData } from "@/types";

type MeasurementFormProps = {
  value: MeasurementData;
  onChange: (value: MeasurementData) => void;
  errors?: Record<string, string>;
};

const MEASUREMENT_GUIDE = [
  {
    label: "Chest",
    instruction:
      "Measure around the fullest part of your bust, keeping the tape level.",
  },
  {
    label: "Waist",
    instruction:
      "Measure around your natural waistline, the narrowest part of your torso.",
  },
  {
    label: "Height",
    instruction:
      "Stand straight against a wall. Measure from the top of your head to the floor.",
  },
  {
    label: "Shoulder",
    instruction:
      "Measure straight across your back from the edge of one shoulder to the other.",
  },
];

export default function MeasurementForm({
  value,
  onChange,
  errors,
}: MeasurementFormProps) {
  const [guideOpen, setGuideOpen] = useState(false);

  const update = (field: keyof MeasurementData, fieldValue: string | number) => {
    onChange({ ...value, [field]: fieldValue });
  };

  return (
    <section className="bg-white rounded-sm border border-[#E5D5C5]/50 p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Ruler className="h-5 w-5 text-[#95271D]" aria-hidden="true" />
        <h2 className="text-sm font-semibold uppercase tracking-widest text-[#1C1C1C]">
          Body Measurements
        </h2>
      </div>

      <p className="text-xs text-[#6B6B6B] leading-relaxed">
        All measurements are in centimetres (cm). These are used solely to craft
        your custom-fit outfit.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Chest */}
        <div>
          <label
            htmlFor="measurement-chest"
            className="block text-xs font-medium text-[#1C1C1C] mb-1"
          >
            Chest (cm) *
          </label>
          <input
            id="measurement-chest"
            type="number"
            min={50}
            max={150}
            step={0.1}
            value={value.chest || ""}
            onChange={(e) => update("chest", parseFloat(e.target.value) || 0)}
            aria-invalid={!!errors?.chest}
            aria-describedby={errors?.chest ? "error-chest" : undefined}
            className={`w-full rounded border bg-white px-3 py-2 text-sm text-[#1C1C1C] placeholder:text-[#6B6B6B]/80 focus:outline-none focus:ring-2 focus:ring-[#800020] ${
              errors?.chest ? "border-[#C41E3A]" : "border-[#E5D5C5]"
            }`}
            placeholder="e.g. 92.5"
          />
          {errors?.chest && (
            <p id="error-chest" className="mt-1 text-xs text-[#C41E3A]">
              {errors.chest}
            </p>
          )}
        </div>

        {/* Waist */}
        <div>
          <label
            htmlFor="measurement-waist"
            className="block text-xs font-medium text-[#1C1C1C] mb-1"
          >
            Waist (cm) *
          </label>
          <input
            id="measurement-waist"
            type="number"
            min={40}
            max={130}
            step={0.1}
            value={value.waist || ""}
            onChange={(e) => update("waist", parseFloat(e.target.value) || 0)}
            aria-invalid={!!errors?.waist}
            aria-describedby={errors?.waist ? "error-waist" : undefined}
            className={`w-full rounded border bg-white px-3 py-2 text-sm text-[#1C1C1C] placeholder:text-[#6B6B6B]/80 focus:outline-none focus:ring-2 focus:ring-[#800020] ${
              errors?.waist ? "border-[#C41E3A]" : "border-[#E5D5C5]"
            }`}
            placeholder="e.g. 74.0"
          />
          {errors?.waist && (
            <p id="error-waist" className="mt-1 text-xs text-[#C41E3A]">
              {errors.waist}
            </p>
          )}
        </div>

        {/* Full Height */}
        <div>
          <label
            htmlFor="measurement-full_height"
            className="block text-xs font-medium text-[#1C1C1C] mb-1"
          >
            Full Height (cm) *
          </label>
          <input
            id="measurement-full_height"
            type="number"
            min={100}
            max={220}
            step={0.1}
            value={value.full_height || ""}
            onChange={(e) =>
              update("full_height", parseFloat(e.target.value) || 0)
            }
            aria-invalid={!!errors?.full_height}
            aria-describedby={errors?.full_height ? "error-full_height" : undefined}
            className={`w-full rounded border bg-white px-3 py-2 text-sm text-[#1C1C1C] placeholder:text-[#6B6B6B]/80 focus:outline-none focus:ring-2 focus:ring-[#800020] ${
              errors?.full_height ? "border-[#C41E3A]" : "border-[#E5D5C5]"
            }`}
            placeholder="e.g. 165.0"
          />
          {errors?.full_height && (
            <p id="error-full_height" className="mt-1 text-xs text-[#C41E3A]">
              {errors.full_height}
            </p>
          )}
        </div>

        {/* Shoulder */}
        <div>
          <label
            htmlFor="measurement-shoulder"
            className="block text-xs font-medium text-[#1C1C1C] mb-1"
          >
            Shoulder (cm) *
          </label>
          <input
            id="measurement-shoulder"
            type="number"
            min={25}
            max={70}
            step={0.1}
            value={value.shoulder || ""}
            onChange={(e) =>
              update("shoulder", parseFloat(e.target.value) || 0)
            }
            aria-invalid={!!errors?.shoulder}
            aria-describedby={errors?.shoulder ? "error-shoulder" : undefined}
            className={`w-full rounded border bg-white px-3 py-2 text-sm text-[#1C1C1C] placeholder:text-[#6B6B6B]/80 focus:outline-none focus:ring-2 focus:ring-[#800020] ${
              errors?.shoulder ? "border-[#C41E3A]" : "border-[#E5D5C5]"
            }`}
            placeholder="e.g. 40.0"
          />
          {errors?.shoulder && (
            <p id="error-shoulder" className="mt-1 text-xs text-[#C41E3A]">
              {errors.shoulder}
            </p>
          )}
        </div>
      </div>

      {/* Personalisation Request */}
      <div>
        <label
          htmlFor="measurement-personalisation"
          className="block text-xs font-medium text-[#1C1C1C] mb-1"
        >
          Personalisation Request (optional)
        </label>
        <textarea
          id="measurement-personalisation"
          rows={3}
          maxLength={1000}
          value={value.personalisation_request ?? ""}
          onChange={(e) => update("personalisation_request", e.target.value)}
          aria-describedby="personalisation-hint"
          className="w-full rounded border border-[#E5D5C5] bg-white px-3 py-2 text-sm text-[#1C1C1C] placeholder:text-[#6B6B6B]/80 focus:outline-none focus:ring-2 focus:ring-[#800020]"
          placeholder="E.g. Prefer a longer hemline, tighter sleeves, specific embroidery placement..."
        />
        <p
          id="personalisation-hint"
          className="mt-1 text-right text-[10px] text-[#6B6B6B]"
        >
          {(value.personalisation_request ?? "").length}/1000
        </p>
      </div>

      {/* How to Measure Guide */}
      <div className="rounded-sm border border-[#D4A843]/30 bg-[#D4A843]/5">
        <button
          type="button"
          onClick={() => setGuideOpen((prev) => !prev)}
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-[#1C1C1C]"
          aria-expanded={guideOpen}
          aria-controls="measurement-guide-content"
        >
          <span className="flex items-center gap-2">
            <Info className="h-4 w-4 text-[#D4A843]" aria-hidden="true" />
            How to Measure
          </span>
          {guideOpen ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-[#6B6B6B]" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-[#6B6B6B]" aria-hidden="true" />
          )}
        </button>

        {guideOpen && (
          <div
            id="measurement-guide-content"
            role="region"
            aria-label="How to Measure guide"
            className="border-t border-[#D4A843]/20 px-4 pb-4 pt-3"
          >
            <ol className="space-y-3 text-xs text-[#6B6B6B] leading-relaxed">
              {MEASUREMENT_GUIDE.map((item) => (
                <li key={item.label} className="flex gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#95271D] text-[10px] font-semibold text-white">
                    {item.label.charAt(0)}
                  </span>
                  <div>
                    <span className="font-medium text-[#1C1C1C]">
                      {item.label}:{" "}
                    </span>
                    {item.instruction}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  );
}
