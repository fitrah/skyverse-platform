import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Kebijakan Privasi — Skyverse",
  description: "Kebijakan privasi Skyverse.",
};

export default function PrivacyPolicyPage() {
  return <main className="policyPage">
    <article className="policyContent">
      <Link className="logo" href="/">SKY<span>VERSE</span></Link>
      <h1>Kebijakan Privasi</h1>
      <p className="policyDate">Terakhir diperbarui: 21 Oktober 2026</p>

      <p>Skyverse adalah platform game komunitas yang dikelola oleh Kanezza. Kebijakan ini menjelaskan informasi yang kami kumpulkan, cara kami menggunakannya, dan pilihan yang tersedia bagi pemain.</p>

      <h2>Informasi yang kami kumpulkan</h2>
      <p>Saat kamu membuat akun dengan email, kami menyimpan username, alamat email, password yang sudah di-hash, progres permainan, riwayat hasil permainan, dan data session agar kamu tetap dapat masuk ke Skyverse.</p>
      <p>Jika kamu masuk menggunakan Google, kami menerima informasi dasar dari Google seperti Google account ID, nama, alamat email, dan status verifikasi email. Kami tidak menerima atau menyimpan password Google.</p>
      <p>Skyverse juga dapat menggunakan analytics setelah kamu memberikan izin melalui banner consent. Data analytics digunakan untuk memahami penggunaan halaman dan meningkatkan pengalaman bermain.</p>

      <h2>Bagaimana informasi digunakan</h2>
      <p>Informasi digunakan untuk membuat dan mengamankan akun, menyimpan progres, menampilkan profil pemain, menyediakan fitur game online, menjalankan Creator, mencegah penyalahgunaan, serta memperbaiki performa dan pengalaman Skyverse.</p>

      <h2>Penyimpanan dan keamanan</h2>
      <p>Password tidak disimpan dalam bentuk teks biasa. Session menggunakan cookie HTTP-only dan memiliki masa berlaku terbatas. Kami menerapkan langkah teknis yang wajar untuk melindungi data, tetapi tidak ada sistem internet yang dapat dijamin aman secara mutlak.</p>

      <h2>Pihak ketiga</h2>
      <p>Skyverse dapat menggunakan Google untuk login dan analytics. Penggunaan layanan tersebut juga tunduk pada kebijakan privasi masing-masing penyedia. Kami tidak menjual data pribadi pemain.</p>

      <h2>Hak dan pilihan kamu</h2>
      <p>Kamu dapat berhenti menggunakan Skyverse dan meminta bantuan terkait akun melalui kanal kontak yang tersedia di platform. Kamu juga dapat menolak analytics melalui banner consent. Menghapus cookie session dapat membuat kamu perlu login kembali.</p>

      <h2>Perubahan kebijakan</h2>
      <p>Kebijakan ini dapat diperbarui ketika fitur, layanan, atau kewajiban hukum berubah. Versi terbaru akan dipublikasikan pada halaman ini bersama tanggal pembaruannya.</p>

      <h2>Kontak</h2>
      <p>Untuk pertanyaan tentang privasi atau akun, gunakan kanal kontak resmi Skyverse/Kanezza yang tersedia pada platform ini.</p>

      <p><Link href="/terms-of-service">Baca Terms of Service →</Link></p>
    </article>
  </main>;
}
