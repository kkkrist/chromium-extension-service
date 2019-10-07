import { h, app } from '../lib/vendor/hyperapp-2.0.1.js'

app({
  init: [
    { extensions: [] },
    [
      dispatch =>
        fetch('/api/stats')
          .then(res => res.json())
          .then(json => dispatch({ extensions: json }))
          .catch(console.error)
    ]
  ],
  view: state =>
    h('div', {}, [
      h('table', { cellspacing: 0 }, [
        h('thead', {}, [
          h('tr', {}, [
            h('th', {}, `ids (${state.extensions.length})`),
            h(
              'th',
              {},
              `prodversions (${
                state.extensions.reduce(
                  (set, ext) => set.add(...ext.prodversions),
                  new Set()
                ).size
              })`
            ),
            h(
              'th',
              {},
              `timestamps (${
                state.extensions.reduce(
                  (set, ext) => set.add(ext.timestamp),
                  new Set()
                ).size
              })`
            )
          ])
        ]),
        h(
          'tbody',
          {},
          state.extensions.length > 0
            ? state.extensions.map(ext =>
                h('tr', {}, [
                  h('td', {}, [
                    ext.updateUrl.includes('clients2.google.com')
                      ? h(
                          'a',
                          {
                            href: `https://chrome.google.com/webstore/detail/${
                              ext._id
                            }`,
                            target: '_blank'
                          },
                          ext._id
                        )
                      : ext._id
                  ]),
                  h('td', {}, [
                    h(
                      'ul',
                      {},
                      ext.prodversions
                        .sort((a, b) => b.localeCompare(a))
                        .map(v => h('li', {}, v))
                    )
                  ]),
                  h('td', {}, new Date(ext.timestamp).toLocaleString())
                ])
              )
            : h('tr', {}, [h('td', { colspan: 4 }, 'Loading…')])
        )
      ])
    ]),
  node: document.getElementById('app')
})
