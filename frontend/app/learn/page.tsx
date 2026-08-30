import type { Metadata } from "next";
import { LearningStudio } from "./LearningStudio";

export const metadata: Metadata = {
  title: "Start learning — Ocular",
  description: "Turn a topic, note, or document into a clear visual lesson.",
};

export default function LearnPage() {
  return <LearningStudio />;
}
