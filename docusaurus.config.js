// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

module.exports= {
title: 'sny0',
  tagline: 'Rabbits are cute!',
  favicon: 'img/sny0_icon.png',

  // Set the production url of your site here
  url: 'https://sny0.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/my-docusaurus/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'sny0', // Usually your GitHub org/user name.
  projectName: 'my-docusaurus', // Usually your repo name.
  trailingSlash: false,
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: 
          {
            sidebarPath: require.resolve('./sidebars.js'),
          },
        blog: {
          showReadingTime: true,
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      image: 'img/docusaurus-social-card.jpg',
      navbar: {
        title: 'sny0',
        logo: {
          alt: 'My Site Logo',
          src: 'img/sny0_icon.png',
        },
        items: [
          {
            label: 'Profile',
            to: '/profile'
          },
          {
            type: 'doc',
            docId: 'tank',
            position: 'left',
            label: 'Portfolio',
          },
          {to: '/blog', label: 'Blog', position: 'left'},
          {
            href: 'https://github.com/sny0',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Portfolio',
            items: [
              {
                label: '学部時代',
                to: '/docs/tank',
              },
              {
                label: 'Unity1WeekGameJam',
                to: '/docs/hikyakuchan',
              }
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'Blog',
                to: '/blog',
              },
              {
                label: 'GitHub',
                href: 'https://github.com/sny0',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} sny0. Built with Docusaurus.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};