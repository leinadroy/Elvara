import PDFDocument from 'pdfkit';
import { ATTENDANCE_STATUS_LABELS, type ReportCardContent } from '@smart-school/contracts';

export interface ReportCardPdfMeta {
  versionNo: number;
  publishedAt: Date;
  approvedBy: string;
  revisionReason: string | null;
  timezone: string;
}

const MARGIN = 48;
const INK = '#1f1f1f';
const MUTED = '#666666';
const RULE = '#bbbbbb';

/**
 * PDF rapor dari isi snapshot (PRD R2 FR-15.5). Templat sederhana: kop sekolah, identitas, nilai dan deskripsi
 * per mapel, kehadiran, catatan wali kelas, tanda tangan. Templat resmi sekolah (kop, logo, tanda tangan) menyusul.
 * Hanya memakai font standar PDF agar tidak bergantung pada berkas font.
 */
export function renderReportCardPdf(c: ReportCardContent, meta: ReportCardPdfMeta): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margin: MARGIN,
    bufferPages: true,
    info: { Title: `Rapor ${c.student.fullName} ${c.term.name}`, Author: c.school.name, Subject: 'Laporan hasil belajar', CreationDate: meta.publishedAt, ModDate: meta.publishedAt },
  });
  const chunks: Buffer[] = [];
  doc.on('data', (b: Buffer) => chunks.push(b));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const width = doc.page.width - MARGIN * 2;
  const left = MARGIN;
  const dateFmt = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeZone: meta.timezone });

  const ensureSpace = (h: number) => {
    if (doc.y + h > doc.page.height - MARGIN - 20) doc.addPage();
  };
  const rule = () => {
    doc.moveTo(left, doc.y).lineTo(left + width, doc.y).lineWidth(0.6).strokeColor(RULE).stroke();
  };

  // Kop sekolah
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(14).text(c.school.name, { align: 'center' });
  const sub = [c.school.npsn ? `NPSN ${c.school.npsn}` : null, c.school.address].filter(Boolean).join(' · ');
  if (sub) doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(sub, { align: 'center' });
  doc.moveDown(0.5);
  rule();
  doc.moveDown(0.8);
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(12).text('LAPORAN HASIL BELAJAR', { align: 'center' });
  doc.moveDown(0.8);

  // Identitas
  const ident: [string, string][] = [
    ['Nama', c.student.fullName],
    ['NIS / NISN', `${c.student.nis ?? '-'} / ${c.student.nisn ?? '-'}`],
    ['Rombel', c.classGroup.code],
    ['Semester', c.term.name],
    ['Tahun ajaran', c.term.academicYear],
  ];
  doc.fontSize(10);
  for (const [k, v] of ident) {
    const y = doc.y;
    doc.font('Helvetica').fillColor(MUTED).text(k, left, y, { width: 110 });
    doc.font('Helvetica-Bold').fillColor(INK).text(`: ${v}`, left + 110, y, { width: width - 110 });
  }
  doc.moveDown(1);

  // Tabel nilai
  const cols = [
    { title: 'No', w: 26 },
    { title: 'Mata pelajaran', w: 130 },
    { title: 'Nilai akhir', w: 60 },
    { title: 'Capaian kompetensi', w: width - 216 },
  ];
  const pad = 5;
  const header = () => {
    const y = doc.y;
    doc.rect(left, y, width, 20).fillColor('#f1eeee').fill();
    let x = left;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(INK);
    for (const col of cols) {
      doc.text(col.title, x + pad, y + 6, { width: col.w - pad * 2 });
      x += col.w;
    }
    doc.y = y + 20;
  };
  header();
  c.subjects.forEach((s, i) => {
    const desc = [s.highestAchievement ? `Menguasai: ${s.highestAchievement}` : null, s.needsImprovement ? `Perlu ditingkatkan: ${s.needsImprovement}` : null].filter(Boolean).join('\n\n') || '-';
    doc.font('Helvetica').fontSize(9);
    const h = Math.max(doc.heightOfString(desc, { width: cols[3]!.w - pad * 2 }), doc.heightOfString(s.subject.name, { width: cols[1]!.w - pad * 2 })) + pad * 2;
    if (doc.y + h > doc.page.height - MARGIN - 30) {
      doc.addPage();
      header();
    }
    const y = doc.y;
    let x = left;
    const score = s.finalScore === null ? '-' : String(s.finalScore);
    const cells = [String(i + 1), s.subject.name, score, desc];
    cells.forEach((text, ci) => {
      const col = cols[ci]!;
      doc
        .font(ci === 2 ? 'Helvetica-Bold' : 'Helvetica')
        .fillColor(INK)
        .text(text, x + pad, y + pad, { width: col.w - pad * 2, align: ci === 2 ? 'center' : 'left' });
      x += col.w;
    });
    doc.y = y + h;
    doc.moveTo(left, doc.y).lineTo(left + width, doc.y).lineWidth(0.4).strokeColor(RULE).stroke();
  });
  if (!c.subjects.length) doc.font('Helvetica').fontSize(9).text('Belum ada mata pelajaran.', left + pad, doc.y + pad);
  const kktp = [...new Set(c.subjects.map((s) => s.passingScore).filter((n): n is number => n !== null))];
  if (kktp.length) {
    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(`KKTP: ${kktp.join(', ')}. Nilai akhir dibulatkan sekali ke bilangan bulat.`, left, doc.y, { width });
  }
  doc.moveDown(1);

  // Kehadiran
  ensureSpace(80);
  doc.font('Helvetica-Bold').fontSize(10).fillColor(INK).text('Kehadiran', left);
  doc.moveDown(0.3);
  const att = (['SICK', 'EXCUSED', 'ABSENT', 'LATE'] as const).map((k) => `${ATTENDANCE_STATUS_LABELS[k]}: ${c.attendance[k]} hari`);
  doc.font('Helvetica').fontSize(9).text(att.join('     '), left);
  doc.moveDown(1);

  // Catatan wali kelas
  ensureSpace(70);
  doc.font('Helvetica-Bold').fontSize(10).text('Catatan wali kelas', left);
  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(9).text(c.homeroomNote || '-', left, doc.y, { width });
  doc.moveDown(1.5);

  // Tanda tangan (tinggi blok ±75 pt)
  ensureSpace(80);
  const y = doc.y;
  const half = width / 2;
  doc.font('Helvetica').fontSize(9).fillColor(INK);
  doc.text('Wali kelas', left, y, { width: half, align: 'center' });
  doc.text(`${dateFmt.format(meta.publishedAt)}\nKepala sekolah`, left + half, y - 11, { width: half, align: 'center' });
  doc.font('Helvetica-Bold');
  doc.text(c.homeroomTeacher ?? '-', left, y + 60, { width: half, align: 'center' });
  doc.text(meta.approvedBy, left + half, y + 60, { width: half, align: 'center' });

  // Kaki halaman: versi dan alasan revisi (rapor terbit tidak diubah; revisi = versi baru).
  const foot = `Versi ${meta.versionNo} · diterbitkan ${dateFmt.format(meta.publishedAt)}${meta.revisionReason ? ` · revisi: ${meta.revisionReason}` : ''}`;
  const range = doc.bufferedPageRange();
  for (let p = range.start; p < range.start + range.count; p++) {
    doc.switchToPage(p);
    doc.page.margins.bottom = 0;
    doc.font('Helvetica').fontSize(7).fillColor(MUTED).text(foot, left, doc.page.height - MARGIN + 10, { width, align: 'center', lineBreak: false });
  }
  doc.end();
  return done;
}
