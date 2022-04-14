import type { AppProps } from 'next/app'
import Head from 'next/head';
import Link from 'next/link';

import '../styles/globals.css'
import styles from '../styles/Home.module.css';
import { Routes } from '../routes';

function MyApp({ Component, pageProps, router}: AppProps) {
  const { asPath, route } = router
  return (
    <div className={styles.container}>
      <Head>
        <title>Create Next App</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={styles.main}>
        <Component {...pageProps} />
        <nav className={styles.grid}>
          <Link href={Routes.Home()}>
            <a className={`${styles.card} ${Routes.Home.isActive(asPath) && styles.cardActive || ''}`}>Home</a>
          </Link>
          <Link href={Routes.Detail({ id: 'detail' })}>
            <a className={`${styles.card} ${Routes.Detail.isActive(asPath) && styles.cardActive || 'false'}`}>Detail</a>
          </Link>
        </nav>
      </main>
    </div>
  )
}
export default MyApp
