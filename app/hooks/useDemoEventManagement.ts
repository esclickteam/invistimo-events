"use client";

import { useMemo, useState } from "react";
import { demoEventManagementData } from "@/lib/demo/demoEventManagementData";

type DemoData = typeof demoEventManagementData;

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export function useDemoEventManagement() {
  const [data, setData] = useState<DemoData>(demoEventManagementData);

  const updateEvent = (payload: Partial<DemoData["event"]>) => {
    setData((prev) => ({
      ...prev,
      event: {
        ...prev.event,
        ...payload,
      },
    }));
  };

  const addTask = (task: Omit<DemoData["tasks"][number], "_id">) => {
    setData((prev) => ({
      ...prev,
      tasks: [
        {
          ...task,
          _id: createId("task"),
        },
        ...prev.tasks,
      ],
    }));
  };

  const updateTask = (
    taskId: string,
    payload: Partial<DemoData["tasks"][number]>
  ) => {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task) =>
        task._id === taskId ? { ...task, ...payload } : task
      ),
    }));
  };

  const deleteTask = (taskId: string) => {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((task) => task._id !== taskId),
    }));
  };

  const addSupplier = (
    supplier: Omit<DemoData["suppliers"][number], "_id">
  ) => {
    setData((prev) => ({
      ...prev,
      suppliers: [
        {
          ...supplier,
          _id: createId("supplier"),
        },
        ...prev.suppliers,
      ],
    }));
  };

  const updateSupplier = (
    supplierId: string,
    payload: Partial<DemoData["suppliers"][number]>
  ) => {
    setData((prev) => ({
      ...prev,
      suppliers: prev.suppliers.map((supplier) =>
        supplier._id === supplierId ? { ...supplier, ...payload } : supplier
      ),
    }));
  };

  const deleteSupplier = (supplierId: string) => {
    setData((prev) => ({
      ...prev,
      suppliers: prev.suppliers.filter(
        (supplier) => supplier._id !== supplierId
      ),
    }));
  };

  const addBudgetItem = (
    item: Omit<DemoData["budgetItems"][number], "_id">
  ) => {
    setData((prev) => ({
      ...prev,
      budgetItems: [
        {
          ...item,
          _id: createId("budget"),
        },
        ...prev.budgetItems,
      ],
    }));
  };

  const updateBudgetItem = (
    itemId: string,
    payload: Partial<DemoData["budgetItems"][number]>
  ) => {
    setData((prev) => ({
      ...prev,
      budgetItems: prev.budgetItems.map((item) =>
        item._id === itemId ? { ...item, ...payload } : item
      ),
    }));
  };

  const deleteBudgetItem = (itemId: string) => {
    setData((prev) => ({
      ...prev,
      budgetItems: prev.budgetItems.filter((item) => item._id !== itemId),
    }));
  };

  const addScheduleItem = (
    item: Omit<DemoData["schedule"][number], "_id">
  ) => {
    setData((prev) => ({
      ...prev,
      schedule: [
        ...prev.schedule,
        {
          ...item,
          _id: createId("schedule"),
        },
      ],
    }));
  };

  const updateScheduleItem = (
    itemId: string,
    payload: Partial<DemoData["schedule"][number]>
  ) => {
    setData((prev) => ({
      ...prev,
      schedule: prev.schedule.map((item) =>
        item._id === itemId ? { ...item, ...payload } : item
      ),
    }));
  };

  const deleteScheduleItem = (itemId: string) => {
    setData((prev) => ({
      ...prev,
      schedule: prev.schedule.filter((item) => item._id !== itemId),
    }));
  };

  const addNote = (note: Omit<DemoData["notes"][number], "_id">) => {
    setData((prev) => ({
      ...prev,
      notes: [
        {
          ...note,
          _id: createId("note"),
        },
        ...prev.notes,
      ],
    }));
  };

  const updateNote = (
    noteId: string,
    payload: Partial<DemoData["notes"][number]>
  ) => {
    setData((prev) => ({
      ...prev,
      notes: prev.notes.map((note) =>
        note._id === noteId ? { ...note, ...payload } : note
      ),
    }));
  };

  const deleteNote = (noteId: string) => {
    setData((prev) => ({
      ...prev,
      notes: prev.notes.filter((note) => note._id !== noteId),
    }));
  };

  const resetDemo = () => {
    setData(demoEventManagementData);
  };

  const calculatedStats = useMemo(() => {
    const totalBudget = data.budgetItems.reduce(
      (sum, item) => sum + Number(item.total || 0),
      0
    );

    const paidAmount = data.budgetItems.reduce(
      (sum, item) => sum + Number(item.paid || 0),
      0
    );

    const remainingAmount = totalBudget - paidAmount;

    const completedTasks = data.tasks.filter(
      (task) => task.status === "done"
    ).length;

    const openTasks = data.tasks.length - completedTasks;

    return {
      totalBudget,
      paidAmount,
      remainingAmount,
      completedTasks,
      openTasks,
      suppliers: data.suppliers.length,
      tasks: data.tasks.length,
      scheduleItems: data.schedule.length,
    };
  }, [data]);

  return {
    data,
    calculatedStats,

    updateEvent,

    addTask,
    updateTask,
    deleteTask,

    addSupplier,
    updateSupplier,
    deleteSupplier,

    addBudgetItem,
    updateBudgetItem,
    deleteBudgetItem,

    addScheduleItem,
    updateScheduleItem,
    deleteScheduleItem,

    addNote,
    updateNote,
    deleteNote,

    resetDemo,
  };
}