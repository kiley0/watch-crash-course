# Third-party notices

The [MIT license](LICENSE) covers this project’s original code and artwork. Crash Course and Study Hall videos, quotations, logos, branding, and other third-party material retain their respective rights. Course names, titles, identifiers, and links identify the original material. Videos use YouTube’s official embedded player; no Crash Course logo, mascot, thumbnail, or illustration is copied into the repository.

Watch Crash Course is independent and unaffiliated with Crash Course, Study Hall, Arizona State University, Complexly, or YouTube. The MIT license does not grant rights to their trademarks or imply endorsement.

## Bundled software

Full license texts are retained in [`public/licenses/`](public/licenses/) and published with the site. Exact dependency versions are recorded in `package.json` and `pnpm-lock.yaml`.

| Software                                                  | License and retained notices                                                                                                                                           |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Alpine.js CSP](https://github.com/alpinejs/alpine)       | [MIT](public/licenses/Alpine-MIT.txt), including Vue [reactivity](public/licenses/Vue-Reactivity-MIT.txt) and [shared](public/licenses/Vue-Shared-MIT.txt) MIT notices |
| [localForage](https://github.com/localForage/localForage) | [Apache-2.0](public/licenses/localForage-Apache-2.0.txt), including [lie](public/licenses/lie-MIT.txt) and [immediate](public/licenses/immediate-MIT.txt) MIT notices  |
| [Lucide icons](https://github.com/lucide-icons/lucide)    | [ISC and Feather MIT notices](public/licenses/Lucide-LICENSE.txt); selected static icons are in `public/icons.svg`, with no icon runtime                               |

Development-tool licenses are distributed with their packages. YouTube’s player/API and GoatCounter’s optional analytics script are externally hosted services, not project code covered by our MIT license.
