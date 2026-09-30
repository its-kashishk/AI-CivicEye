"use client";

import React, { useState } from "react";
import { MapPin, Navigation, Check, X, AlertCircle } from "lucide-react";

interface LocationPickerProps {
  location: {
    lat?: number;
    lng?: number;
    address?: string;
    ward?: string;
  };
  onChange: (location: {
    lat?: number;
    lng?: number;
    address?: string;
    ward?: string;
  }) => void;
}

export function LocationPicker({ location, onChange }: LocationPickerProps) {
  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const handleGetCurrentLocation = () => {
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser. Please enter the address manually.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Math.round(pos.coords.latitude * 100000) / 100000;
        const lng = Math.round(pos.coords.longitude * 100000) / 100000;
        setLocating(false);
        onChange({
          ...location,
          lat,
          lng,
          address: location.address || `GPS Location (${lat}, ${lng})`,
          ward: location.ward || "Ward 4 - Central Zone",
        });
      },
      (err) => {
        setLocating(false);
        console.error("GPS error:", err);
        setGpsError("Could not retrieve GPS coordinates. You can type the street or landmark address below.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleClearLocation = () => {
    onChange({
      lat: undefined,
      lng: undefined,
      address: "",
      ward: "",
    });
    setGpsError(null);
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-950/60 border border-blue-800/60 flex items-center justify-center text-blue-400">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-200">
              Incident Geolocation
            </h4>
            <p className="text-[11px] text-slate-400">
              Provide exact coordinates or address for municipal field dispatch
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGetCurrentLocation}
          disabled={locating}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-semibold transition-colors disabled:opacity-50"
        >
          <Navigation className={`w-3.5 h-3.5 ${locating ? "animate-spin" : ""}`} />
          <span>{locating ? "Acquiring GPS..." : "Use Current GPS"}</span>
        </button>
      </div>

      {gpsError && (
        <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/40 text-xs text-amber-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{gpsError}</span>
        </div>
      )}

      {/* Address Text Field */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
          <span>Street Address / Landmark / Neighborhood</span>
          {location.lat && location.lng && (
            <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
              <Check className="w-3 h-3" />
              GPS Attached ({location.lat}, {location.lng})
            </span>
          )}
        </label>
        <div className="relative">
          <input
            type="text"
            value={location.address || ""}
            onChange={(e) =>
              onChange({
                ...location,
                address: e.target.value,
              })
            }
            placeholder="e.g. Near Metro Pillar 142, Western Expressway, Andheri East"
            className="w-full text-xs bg-slate-950 text-slate-200 p-3 rounded-lg border border-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors pr-8"
          />
          {location.address && (
            <button
              type="button"
              onClick={handleClearLocation}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              title="Clear location"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
