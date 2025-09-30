"use client"
import BasicTest from "@/testing/BasicTest";
import { load } from "@/lib/localStorage";
import EventTimeline from "@/components/events";


export default function Page() {
  // note: load only works client-side (since localStorage is undefined on the server)
  const db = load("hngr-db");

  return (
    <EventTimeline data={db} />
  );
}