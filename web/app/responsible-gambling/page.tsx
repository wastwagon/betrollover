import { UnifiedHeader } from '@/components/UnifiedHeader';
import { AppFooter } from '@/components/AppFooter';

export const metadata = {
  title: 'Responsible Gambling | BetRollover',
  description:
    'BetRollover is committed to promoting responsible gambling. 18+ only. Set limits, never chase losses, and seek help if needed.',
};

export default function ResponsibleGamblingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <UnifiedHeader />

      <main>
        <article className="max-w-3xl mx-auto px-6 py-12">
          <h1 className="text-3xl font-bold text-[var(--text)] mb-6">
            Responsible Gambling
          </h1>

          <div className="prose prose-slate max-w-none text-[var(--text)] space-y-6 leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold mt-8 mb-3">Our Commitment</h2>
              <p>
                BetRollover is committed to promoting responsible gambling. Our platform provides
                betting tips and information for entertainment. We encourage users to gamble
                responsibly and within their means.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-3">18+ Only</h2>
              <p>
                You must be 18 years or older to use BetRollover. By using our platform you confirm
                that you meet the legal age requirements in your jurisdiction.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-3">Gambling Responsibly</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Set limits on time and money before you start</li>
                <li>Never chase losses</li>
                <li>Don&apos;t gamble when upset or under the influence</li>
                <li>Gambling should be fun, not a way to make money</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mt-8 mb-3">Get Help</h2>
              <p>
                If you feel you may have a gambling problem, please seek help. Free support is
                available:
              </p>
              <ul className="list-none space-y-2 mt-3">
                <li>
                  <a
                    href="https://www.gamcare.org.uk"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--primary)] hover:underline"
                  >
                    GamCare – www.gamcare.org.uk
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.gamblersanonymous.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--primary)] hover:underline"
                  >
                    Gamblers Anonymous – www.gamblersanonymous.org
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.begambleaware.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--primary)] hover:underline"
                  >
                    BeGambleAware – www.begambleaware.org
                  </a>
                </li>
              </ul>
            </section>

            <div className="mt-10 p-4 bg-[var(--bg-warm)] rounded-lg border border-[var(--border)]">
              <p className="text-sm italic text-[var(--text-muted)]">
                BetRollover provides tips and information only. Users are responsible for their own
                betting decisions and must comply with local laws. Gambling can be addictive. Please
                gamble responsibly.
              </p>
            </div>
          </div>
        </article>

        <div className="mt-16">
          <AppFooter />
        </div>
      </main>
    </div>
  );
}
