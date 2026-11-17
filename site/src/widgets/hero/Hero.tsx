import { Film } from '@/features/film';
import { InstallCommand } from '@/features/install-command';
import { LANDING, SITE } from '@/shared/config';
import { rich } from '@/shared/lib/rich';
import { Action } from '@/shared/ui';
import './Hero.css';

/** The landing, one screen: what the product is on the left, a real run of it on the right. */
export function Hero() {
  const { title, lede, links, under, film } = LANDING.hero;
  return (
    <section className="hero wrap">
      <div className="hero-copy">
        <h1>
          {title.before && <>{title.before} </>}
          {title.chip && (
            <>
              <span className="hero-lead">
                <span className="hero-chip">{title.chip}</span>
                {title.after}
              </span>{' '}
            </>
          )}
          {title.rest}
        </h1>
        <p className="lede">{rich(lede)}</p>
        {links?.length ? (
          <p className="hero-links">
            {links.map((link, at) => (
              <Action key={link.href} href={link.href} filled={at === 0}>
                {link.label}
              </Action>
            ))}
          </p>
        ) : (
          <InstallCommand tabs={SITE.install} />
        )}
        <p className="hero-under">{rich(under)}</p>
      </div>
      {film && (
        <figure className="hero-demo">
          <Film src={film.src} label={film.label} />
        </figure>
      )}
    </section>
  );
}
