import PDFDocument from 'pdfkit';

type ReportSnapshot = {
  school: { name: string; npsn: string | null; address: string | null };
  term: { name: string };
  classGroup: { code: string };
  student: { fullName: string; nis: string; homeroomNote: string | null; attendance: Record<string, number>; subjects: {
    name: string; score: number | null; highestAchievement: string | null; needsImprovement: string | null;
  }[] };
  versionNo: number;
  publishedOn: string;
};

export function renderReportCard(snapshot: ReportSnapshot): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48, info: { Title: 'Rapor hasil belajar' } });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.font('Helvetica-Bold').fontSize(17).text(snapshot.school.name);
    doc.font('Helvetica').fontSize(10);
    if (snapshot.school.npsn) doc.text(`NPSN ${snapshot.school.npsn}`);
    if (snapshot.school.address) doc.text(snapshot.school.address);
    doc.moveDown().font('Helvetica-Bold').fontSize(15).text('Rapor hasil belajar');
    doc.font('Helvetica').fontSize(11).text(`${snapshot.student.fullName}   |   NIS ${snapshot.student.nis}`);
    doc.text(`Rombel ${snapshot.classGroup.code}   |   ${snapshot.term.name}`);
    doc.text(`Versi ${snapshot.versionNo}   |   Terbit ${snapshot.publishedOn}`).moveDown();
    for (const subject of snapshot.student.subjects) {
      if (doc.y > 690) doc.addPage();
      doc.font('Helvetica-Bold').text(`${subject.name}   |   Nilai ${subject.score ?? '-'}`);
      doc.font('Helvetica').text(`Capaian tertinggi: ${subject.highestAchievement ?? '-'}`);
      doc.text(`Perlu ditingkatkan: ${subject.needsImprovement ?? '-'}`).moveDown();
    }
    if (doc.y > 670) doc.addPage();
    doc.font('Helvetica-Bold').text('Kehadiran semester');
    const { PRESENT, EXCUSED, SICK, ABSENT, LATE } = snapshot.student.attendance;
    doc.font('Helvetica').text(`Hadir ${PRESENT}   Izin ${EXCUSED}   Sakit ${SICK}   Alpa ${ABSENT}   Terlambat ${LATE}`).moveDown();
    doc.font('Helvetica-Bold').text('Catatan wali kelas');
    doc.font('Helvetica').text(snapshot.student.homeroomNote || '-');
    doc.end();
  });
}
