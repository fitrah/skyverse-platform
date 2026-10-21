import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — Skyverse",
  description: "Ketentuan penggunaan Skyverse.",
};

export default function TermsOfServicePage() {
  return <main className="policyPage">
    <article className="policyContent">
      <Link className="logo" href="/">SKY<span>VERSE</span></Link>
      <h1>Terms of Service</h1>
      <p className="policyDate">Terakhir diperbarui: 21 Oktober 2026</p>

      <p>Dengan mengakses atau menggunakan Skyverse, kamu menyetujui ketentuan ini. Jika tidak menyetujui ketentuan ini, jangan gunakan layanan Skyverse.</p>

      <h2>Penggunaan layanan</h2>
      <p>Skyverse menyediakan katalog game, akun pemain, progres, game online, dan fitur Creator. Kamu bertanggung jawab untuk menjaga keamanan akun dan memastikan informasi akun yang kamu gunakan tetap benar.</p>

      <h2>Perilaku yang diperbolehkan</h2>
      <p>Kamu wajib menggunakan Skyverse secara wajar dan tidak mengganggu pemain lain, mencoba memperoleh akses tanpa izin, mengeksploitasi bug untuk keuntungan yang tidak semestinya, menyebarkan malware, atau menggunakan layanan untuk aktivitas yang melanggar hukum.</p>

      <h2>Konten buatan pengguna</h2>
      <p>Jika kamu membuat atau memublikasikan game melalui Creator, kamu bertanggung jawab atas ide, teks, aset, dan materi yang kamu kirimkan. Jangan mengirim konten yang melanggar hukum, menipu, mengandung malware, melanggar hak cipta, atau membahayakan anak dan pemain lain.</p>
      <p>Dengan memublikasikan konten, kamu memberi Skyverse izin terbatas untuk menyimpan, menampilkan, dan menyediakan konten tersebut sebagai bagian dari layanan. Kamu tetap bertanggung jawab atas hak yang kamu miliki atau gunakan pada konten tersebut.</p>

      <h2>Game online dan layanan pihak ketiga</h2>
      <p>Game tertentu membutuhkan koneksi internet, session aktif, atau layanan pihak ketiga. Kami dapat mengubah, menghentikan sementara, atau memperbaiki fitur game agar layanan tetap aman dan dapat dipelihara.</p>

      <h2>Akun dan penghentian akses</h2>
      <p>Kami dapat membatasi atau menghentikan akses apabila akun digunakan untuk penyalahgunaan, pelanggaran keamanan, pelanggaran hukum, atau pelanggaran ketentuan ini. Kamu dapat berhenti menggunakan layanan kapan saja.</p>

      <h2>Ketersediaan layanan</h2>
      <p>Skyverse disediakan sebagaimana tersedia. Kami berusaha menjaga layanan tetap berjalan, tetapi tidak menjamin bahwa semua game, fitur, atau server akan selalu tersedia tanpa gangguan atau bebas dari kesalahan.</p>

      <h2>Perubahan ketentuan</h2>
      <p>Kami dapat memperbarui ketentuan ini ketika layanan berubah. Versi terbaru akan dipublikasikan pada halaman ini bersama tanggal pembaruannya. Dengan terus menggunakan Skyverse setelah perubahan berlaku, kamu menyetujui ketentuan yang diperbarui.</p>

      <h2>Kontak</h2>
      <p>Untuk pertanyaan tentang ketentuan penggunaan, gunakan kanal kontak resmi Skyverse/Kanezza yang tersedia pada platform ini.</p>

      <p><Link href="/privacy-policy">Baca Kebijakan Privasi →</Link></p>
    </article>
  </main>;
}
