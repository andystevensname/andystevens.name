import CMS from "netlify-cms"
CMS.init()
CMS.registerPreviewStyle("/netlifycms.css");

var PostPreview = createClass({
    render: function() {
      const { entry, getAsset, widgetsFor } = this.props
  
      return h('article', {},
                h('h1', {}, entry.getIn(['data', 'title']) ),
                h('div', {}, this.props.widgetFor('body')),
                h('div', {className: 'meta'}, 
                  h('span', {}, this.props.widgetFor('date')),
                    this.props.widgetsFor('tags').map(function(tag, index) {
                      if (tag != undefined) {
                        return h('span', {key: index}, "#" + tag.get('data') )
                      }
                    }
                  )
                 )
              )   
    }
  })

  CMS.registerPreviewTemplate('post', PostPreview)