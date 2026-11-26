"use client";

import Link from "next/link";
import { useMemo } from "react";
import { GRADE_STATE_LABELS, type AssignmentGradeBook } from "@smart-school/contracts";
import { columnHelper, DataTable } from "@/components/data-table";

type Row = AssignmentGradeBook["students"][number];
const col = columnHelper<Row>();
const identity = col.accessor("fullName", {
  header: "Siswa",
  cell: ({ row, getValue }) => <div className="min-w-36">
    <p className="font-medium">{getValue()}</p><p className="text-xs text-muted-foreground">NIS {row.original.nis}</p>
  </div>,
});

export function GradeBookTable({ book, assignmentId }: { book: AssignmentGradeBook; assignmentId: string }) {
  const columns = useMemo(() => [identity, ...book.assessments.map((assessment) =>
    col.accessor((row) => row.cells[assessment.id], {
      id: assessment.id,
      header: () => <Link className="inline-block min-w-32 text-primary hover:underline" href={`/teacher/assessments/${assessment.id}`}>
        {assessment.title}<span className="block text-xs text-muted-foreground">{assessment.status === "DRAFT" ? "Draf" : "Terbit"}</span>
      </Link>,
      cell: ({ getValue }) => {
        const cell = getValue();
        if (!cell) return <span className="text-muted-foreground">Di luar daftar</span>;
        return <div className="max-w-48 whitespace-normal py-1">
          <p className="font-medium tabular-nums">{cell.state === "SCORED" ? cell.score : GRADE_STATE_LABELS[cell.state]}</p>
          {cell.feedback && <p className="mt-1 break-words text-xs text-muted-foreground">{cell.feedback}</p>}
        </div>;
      },
    }),
  )], [book.assessments]);

  return <DataTable columns={columns} data={book.students} total={book.students.length} page={1}
    pageSize={book.students.length} basePath="/teacher/assessments" searchParams={{ teachingAssignmentId: assignmentId }}
    caption="Buku nilai per siswa dan penilaian" />;
}
