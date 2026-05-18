"use client";

import { useEffect, useState, type Dispatch, type RefObject, type SetStateAction } from "react";

import type { GooglePlacesWindow, MapsStatus } from "@/lib/types/domain";

type UseLocationSetupAutocompleteParams = {
  apiKey: string;
  enabled: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  locationName: string;
  setAddress: Dispatch<SetStateAction<string>>;
  setName: Dispatch<SetStateAction<string>>;
  setPlaceId: Dispatch<SetStateAction<string>>;
};

export function useLocationSetupAutocomplete({
  apiKey,
  enabled,
  inputRef,
  locationName,
  setAddress,
  setName,
  setPlaceId,
}: UseLocationSetupAutocompleteParams) {
  const [mapsStatus, setMapsStatus] = useState<MapsStatus>(apiKey ? "loading" : "off");

  useEffect(() => {
    if (!enabled || !apiKey || !inputRef.current) {
      return;
    }

    let listener: { remove: () => void } | null = null;
    const mapsWindow = window as GooglePlacesWindow;

    const setupAutocomplete = () => {
      const input = inputRef.current;
      const Autocomplete = mapsWindow.google?.maps?.places?.Autocomplete;

      if (!input || !Autocomplete) {
        return;
      }

      const autocomplete = new Autocomplete(input, {
        fields: ["formatted_address", "name", "place_id"],
      });

      listener = autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        const officialAddress = place.formatted_address?.trim() ?? "";
        const officialName = place.name?.trim() ?? "";

        if (officialAddress) {
          setAddress(officialAddress);
        }

        if (officialName && !locationName.trim()) {
          setName(officialName);
        }

        setPlaceId(place.place_id ?? "");
      });
      setMapsStatus("ready");
    };

    if (mapsWindow.google?.maps?.places?.Autocomplete) {
      setupAutocomplete();
      return () => listener?.remove();
    }

    const scriptId = "kelunia-google-maps-places";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    const handleLoad = () => setupAutocomplete();
    const handleError = () => setMapsStatus("error");

    script.addEventListener("load", handleLoad);
    script.addEventListener("error", handleError);

    return () => {
      listener?.remove();
      script?.removeEventListener("load", handleLoad);
      script?.removeEventListener("error", handleError);
    };
  }, [apiKey, enabled, inputRef, locationName, setAddress, setName, setPlaceId]);

  return mapsStatus;
}
