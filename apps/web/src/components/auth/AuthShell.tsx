import { TowerGrid } from "./TowerGrid";
import styles from "./auth.module.css";

/** Two-panel layout shared by /login and /admin/login. */
export function AuthShell({ brandFoot, children }: { brandFoot: string; children: React.ReactNode }) {
  return (
    <main className={styles.screen}>
      <section className={styles.brandPanel}>
        <div className={styles.towerLayer} aria-hidden="true">
          <TowerGrid />
        </div>
        <div className={styles.brandHead}>
          <p className={styles.wordmark}>VinStay AI</p>
          <p className={styles.tagline}>Vận hành cho thuê căn hộ tại Vinhomes Ocean Park.</p>
        </div>
        <p className={styles.brandFoot}>{brandFoot}</p>
      </section>
      <section className={styles.formPanel}>
        <div className={styles.card}>{children}</div>
      </section>
    </main>
  );
}
