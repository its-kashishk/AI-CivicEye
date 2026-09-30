"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Complaint, Category, Severity } from "@/lib/types";
import { CategoryBadge } from "../ui/CategoryBadge";
import { SeverityBadge } from "../ui/SeverityBadge";
import { StatusBadge } from "../ui/StatusBadge";
import { PriorityBadge } from "../ui/PriorityBadge";
import {
  MapPin,
  ExternalLink,
  Layers,
  Filter,
  Navigation,
  Info,
} from "lucide-react";
import { CATEGORY_LABELS } from "@/lib/constants";

interface InteractiveMapProps {
  complaints: Complaint[];
  hotspots?: Array<{
    address: string;
    lat: number;
    lng: number;
    count: number;
    dominant_category: Category;
    severity: Severity;
  }>;
}

export function InteractiveMap({ complaints, hotspots = [] }: InteractiveMapProps) {
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null
  );
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");

  // Filter items with geographic coordinates
  const geoComplaints = complaints.filter(
    (c) => c.location && c.location.lat && c.location.lng
  );

  const filteredGeoComplaints = geoComplaints.filter((c) => {
    if (selectedCategory !== "ALL" && c.category !== selectedCategory) {
      return false;
    }
    if (selectedSeverity !== "ALL" && c.severity !== selectedSeverity) {
      return false;
    }
    return true;
  });

  // Calculate bounding box or normalized coordinates for canvas projection
  const minLat = 18.9;
  const maxLat = 19.3;
  const minLng = 72.75;
  const maxLng = 73.05;

  const projectToMap = (lat: number, lng: number) => {
    // Normalization with fallback clamping
    const clampedLat = Math.max(minLat, Math.min(maxLat, lat));
    const clampedLng = Math.max(minLng, Math.min(maxLng, lng));

    const x = ((clampedLng - minLng) / (maxLng - minLng)) * 100;
    const y = (1 - (clampedLat - minLat) / (maxLat - minLat)) * 100;
    return { x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) };
  };

  const getSeverityPinColor = (sev?: Severity | null) => {
    switch (sev) {
      case "CRITICAL":
        return "bg-rose-500 ring-rose-500/40 text-rose-100";
      case "HIGH":
        return "bg-amber-500 ring-amber-500/40 text-amber-100";
      case "MEDIUM":
        return "bg-sky-500 ring-sky-500/40 text-sky-100";
      default:
        return "bg-emerald-500 ring-emerald-500/40 text-emerald-100";
    }
  };

  return (
    <div className="space-y-4">
      {/* Map Filter Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Filter className="w-4 h-4 text-blue-400" />
          <span>Geospatial Filters:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs bg-slate-950 text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-800 focus:outline-none"
          >
            <option value="ALL">All Categories ({geoComplaints.length})</option>
            {Object.entries(CATEGORY_LABELS).map(([cat, label]) => (
              <option key={cat} value={cat}>
                {label}
              </option>
            ))}
          </select>

          {/* Severity Filter */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="text-xs bg-slate-950 text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-800 focus:outline-none"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <span className="text-xs text-slate-400 font-mono pl-2">
            Showing {filteredGeoComplaints.length} geo-tagged incidents
          </span>
        </div>
      </div>

      {/* Main Map Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 relative h-[520px] rounded-2xl bg-[#090D14] border border-slate-800 overflow-hidden shadow-2xl">
          {/* Grid Blueprint Texture */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, #3b82f6 1px, transparent 0)`,
              backgroundSize: "32px 32px",
            }}
          />

          {/* Abstract Municipal District Contours */}
          <svg className="absolute inset-0 w-full h-full stroke-slate-800/80 fill-none pointer-events-none">
            <path
              d="M 50 100 Q 200 150 400 120 T 700 300 T 900 450"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
            <path
              d="M 120 400 C 300 350, 450 480, 750 420"
              strokeWidth="1.5"
              strokeDasharray="2 3"
            />
            <circle cx="50%" cy="50%" r="28%" strokeWidth="1" strokeDasharray="6 6" />
          </svg>

          {/* Map Compass & HUD */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 p-2 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] font-mono text-slate-300">
            <Navigation className="w-3.5 h-3.5 text-blue-400 rotate-45" />
            <span>Metropolitan Urban Sector Grid (19.07° N, 72.87° E)</span>
          </div>

          {/* Map Legend */}
          <div className="absolute bottom-4 left-4 z-10 flex flex-wrap items-center gap-3 p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300">
            <span className="font-semibold text-slate-400">Severity:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span>Critical</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>High</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
              <span>Medium</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Low</span>
            </div>
          </div>

          {/* Incident Pins */}
          {filteredGeoComplaints.map((item) => {
            const pos = projectToMap(item.location!.lat!, item.location!.lng!);
            const isSelected = selectedComplaint?.id === item.id;
            const pinColor = getSeverityPinColor(item.severity);

            return (
              <button
                key={item.id}
                onClick={() => setSelectedComplaint(item)}
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 group transition-all duration-300 focus:outline-none`}
                title={`${item.category}: ${item.location?.address || "Location"}`}
              >
                <div
                  className={`w-5 h-5 rounded-full ${pinColor} ring-4 flex items-center justify-center shadow-lg transition-transform ${
                    isSelected ? "scale-150 ring-white" : "group-hover:scale-125"
                  }`}
                >
                  <MapPin className="w-3 h-3 text-white" />
                </div>

                {/* Tooltip on Hover */}
                <div className="hidden group-hover:block absolute bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap z-30 px-2 py-1 rounded bg-slate-950 text-white text-[10px] font-mono border border-slate-800 shadow-xl pointer-events-none">
                  {item.location?.address || item.id.slice(0, 8)}
                </div>
              </button>
            );
          })}

          {filteredGeoComplaints.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <MapPin className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-400">
                No geo-located complaints matching active filters.
              </p>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Complaints submitted with GPS coordinates or verified addresses appear as live pins.
              </p>
            </div>
          )}
        </div>

        {/* Selected Incident Drawer / Details */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 flex flex-col justify-between space-y-4">
          {selectedComplaint ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-mono text-blue-400">
                  ID: {selectedComplaint.id.slice(0, 8)}...
                </span>
                <StatusBadge status={selectedComplaint.status} size="sm" />
              </div>

              <div>
                <h4 className="text-sm font-semibold text-white mb-2 leading-snug">
                  {selectedComplaint.text}
                </h4>
                <div className="flex flex-wrap items-center gap-2 my-2">
                  {selectedComplaint.category && (
                    <CategoryBadge
                      category={selectedComplaint.category}
                      size="sm"
                    />
                  )}
                  {selectedComplaint.severity && (
                    <SeverityBadge
                      severity={selectedComplaint.severity}
                      size="sm"
                    />
                  )}
                </div>
              </div>

              {selectedComplaint.location && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                  <div className="text-[11px] text-slate-400 font-semibold uppercase">
                    Incident Location
                  </div>
                  <div className="text-slate-200">
                    {selectedComplaint.location.address || "Unspecified street"}
                  </div>
                  {selectedComplaint.location.lat && selectedComplaint.location.lng && (
                    <div className="text-[10px] text-blue-400 font-mono">
                      GPS: {selectedComplaint.location.lat},{" "}
                      {selectedComplaint.location.lng}
                    </div>
                  )}
                </div>
              )}

              {selectedComplaint.priority && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">
                    Priority Score
                  </span>
                  <PriorityBadge
                    level={selectedComplaint.priority.level}
                    score={selectedComplaint.priority.score}
                    size="sm"
                  />
                </div>
              )}

              <Link
                href={`/authority/complaints/${selectedComplaint.id}`}
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <span>Inspect Full Incident Dossier</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3">
              <Info className="w-8 h-8 text-slate-600" />
              <h4 className="text-sm font-semibold text-slate-300">
                Select a Pin on the Map
              </h4>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                Click any color-coded pin on the geospatial grid to inspect incident details, severity ranking, and dispatch actions.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
