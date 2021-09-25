import CMS from "netlify-cms"
CMS.init()
CMS.registerPreviewStyle("/netlifycms.css");

var PostPreview = createClass({
    render: function() {
      const { entry, getAsset, widgetsFor } = this.props
  
      return h('article', {},
                h('h1', {}, entry.getIn(['data', 'title']) ),
                h('div', {}, this.props.widgetFor('body')),
                h('div', { className: 'date'}, this.props.widgetFor('date') ),
              )   
    }
  })

  CMS.registerPreviewTemplate('post', PostPreview)