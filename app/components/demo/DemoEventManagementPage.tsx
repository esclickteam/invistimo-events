"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { useDemoEventManagement } from "../../hooks/useDemoEventManagement";

import DemoOverviewTab from "./DemoOverviewTab";
import DemoTasksTab from "./DemoTasksTab";
import DemoSuppliersTab from "./DemoSuppliersTab";
import DemoBudgetTab from "./DemoBudgetTab";
import DemoScheduleTab from "./DemoScheduleTab";
import DemoNotesTab from "./DemoNotesTab";

type TabKey =
  | "overview"
  | "tasks"
  | "suppliers"
  | "budget"
  | "schedule"
  | "notes";

const tabs: { key: TabKey; label: string }[] = [
  { key: "overview", label: "סקירה" },
  { key: "tasks", label: "משימות" },
  { key: "suppliers", label: "ספקים" },
  { key: "budget", label: "תקציב" },
  { key: "schedule", label: "לו״ז" },
  { key: "notes", label: "הערות" },
];

export default function DemoEventManagementPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const demo = useDemoEventManagement();
  const { data, calculatedStats, resetDemo } = demo;

  return (
    <main dir="rtl" className="min-h-screen bg-[#f7f3ee] px-4 py-6">
      <section className="mx-auto max-w-7xl">
        <div className="mb-5 rounded-3xl border border-[#e6d7c8] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 inline-flex rounded-full bg-[#f4eadf] px-4 py-1 text-sm font-bold text-[#8a5a2b]">
                מצב דמו פעיל · הנתונים לא נשמרים
              </div>

              <h1 className="text-2xl font-black text-[#2f241c] md:text-3xl">
                {data.event.title}
              </h1>

              <p className="mt-1 text-sm text-[#7b6a58]">
                {data.event.date} · {data.event.time} · {data.event.location}
              </p>
            </div>

            <button
              type="button"
              onClick={resetDemo}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#d8c5b3] bg-white px-4 py-2 text-sm font-bold text-[#6f4b2b] transition hover:bg-[#f4eadf]"
            >
              <RotateCcw size={16} />
              איפוס דמו
            </button>
          </div>
        </div>

        <div className="mb-5 overflow-x-auto rounded-3xl border border-[#e6d7c8] bg-white p-2 shadow-sm">
          <div className="flex min-w-max gap-2">
            {tabs.map((tab) => {
              const selected = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={[
                    "rounded-2xl px-5 py-2 text-sm font-bold transition",
                    selected
                      ? "bg-[#8a5a2b] text-white shadow-sm"
                      : "text-[#6f4b2b] hover:bg-[#f4eadf]",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === "overview" && (
          <DemoOverviewTab
            event={data.event}
            stats={calculatedStats}
            updateEvent={demo.updateEvent}
          />
        )}

        {activeTab === "tasks" && (
          <DemoTasksTab
            tasks={data.tasks}
            addTask={demo.addTask}
            updateTask={demo.updateTask}
            deleteTask={demo.deleteTask}
          />
        )}

        {activeTab === "suppliers" && (
          <DemoSuppliersTab
            suppliers={data.suppliers}
            addSupplier={demo.addSupplier}
            updateSupplier={demo.updateSupplier}
            deleteSupplier={demo.deleteSupplier}
          />
        )}

        {activeTab === "budget" && (
          <DemoBudgetTab
            budgetItems={data.budgetItems}
            stats={calculatedStats}
            addBudgetItem={demo.addBudgetItem}
            updateBudgetItem={demo.updateBudgetItem}
            deleteBudgetItem={demo.deleteBudgetItem}
          />
        )}

        {activeTab === "schedule" && (
          <DemoScheduleTab
            schedule={data.schedule}
            addScheduleItem={demo.addScheduleItem}
            updateScheduleItem={demo.updateScheduleItem}
            deleteScheduleItem={demo.deleteScheduleItem}
          />
        )}

        {activeTab === "notes" && (
          <DemoNotesTab
            notes={data.notes}
            addNote={demo.addNote}
            updateNote={demo.updateNote}
            deleteNote={demo.deleteNote}
          />
        )}
      </section>
    </main>
  );
}