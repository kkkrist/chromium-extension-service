import { h, app } from './vendor/hyperapp-2.0.1.js'

app({
  init: [
    { ids: [], prodversions: [] },
    [
      dispatch =>
        fetch('/api/stats')
          .then(res => res.json())
          .then(json => dispatch(json))
          .catch(console.error)
    ]
  ],
  view: state =>
    h('div', {}, [
      h('p', {}, 'ids'),
      h(
        'ul',
        {},
        state.ids.length > 0
          ? state.ids.map(id =>
              h('li', {}, [
                h(
                  'a',
                  {
                    href: `https://chrome.google.com/webstore/detail/${id._id}`,
                    target: '_blank'
                  },
                  id._id
                ),
                h(
                  'span',
                  {},
                  ` (${id.total}) ${new Date(id.timestamp).toLocaleString()}`
                )
              ])
            )
          : [h('li', {}, 'Loading…')]
      ),

      h('p', {}, 'prodversions'),
      h(
        'ul',
        {},
        state.prodversions.length > 0
          ? state.prodversions.map(ver =>
              h(
                'li',
                {},
                `${ver._id} (${ver.total}) ${new Date(
                  ver.timestamp
                ).toLocaleString()}`
              )
            )
          : [h('li', {}, 'Loading…')]
      )
    ]),
  node: document.getElementById('app')
})
