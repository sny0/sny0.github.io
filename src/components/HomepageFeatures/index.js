import React from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';
import JobProgrammerPng from '@site/static/img/job_programmer.png';
import VrGogglePng from '@site/static/img/vr_goggle.png';
import VideogameBoyPng from '@site/static/img/videogame_boy.png';

const FeatureList = [
  {
    title: 'Gamer',
    Img: VideogameBoyPng,
    description: (
      <>
        I have a deep passion for computer games, their history, and the creators behind them!
      </>
    ),
  },
  {
    title: 'Programmer',
    Img: JobProgrammerPng,
    description: (
      <>
        I am developing several computer games and applications!
      </>
    ),
  },
  {
    title: 'VR Researcher',
    Img: VrGogglePng,
    description: (
      <>
        I am conducting research in VR, particularly in 3D display, and have presented at several academic conferences!
      </>
    ),
  },
];

function Feature({Img, title, description}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <img src={Img} alt={title} className={styles.featureImg} style={{ width: '250px', height: '250px' }} />
      </div>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className='container'>
        <div className='row'>
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
