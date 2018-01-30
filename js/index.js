/*
 * IMPORTANT EQUATIONS
 * ================
 *
 * Point on circumference:
 *     x = cx + r * cos(a)
 *     y = cy + r * sin(a)
 *
 */

var two = new Two({
  fullscreen: false,
  height: window.innerHeight,
  width: window.innerWidth,
  type: Two.Types.svg
}).appendTo(document.getElementById('canvas-container'));

// Let's try to make this accessible as possible

/* var title = document.createElement('title');
title.id = 'backgroundTitle';
var titleText = document.createTextNode('A series of abstract animations representing page categories');
title.appendChild(titleText);

var desc = document.createElement('desc');
desc.id = 'backgroundDescription';
var descText = document.createTextNode('An animation cycles every few seconds between the following animations: ten yellow triangles on top of one another fading in and out and moving back and forth representing light through the trees or a stage spotlight, a number of jittering red horizontal lines staged vertically to look like lines of an anxious poem, three neon gears (two large and one small pinion gear) slowly cranking away.');
desc.append(descText);

var svg = document.querySelector('#canvas-container svg');
svg.append(title);
svg.append(desc);
svg.setAttribute('aria-labelledby', 'backgroundTitle backgroundDescription');
svg.setAttribute('role', 'img'); */


/*
 * Main Groups
 */

var background = two.makeGroup();
background.id = 'background';
var foreground = two.makeGroup();
foreground.id = "foreground";


/*
 * Background Groups
 */

var gadgetsGroup = two.makeGroup();
gadgetsGroup.addTo(background);
gadgetsGroup.id = 'gadget-group';

var thingsGroup = two.makeGroup();
thingsGroup.addTo(background);
thingsGroup.id = 'things-group';

var poetryGroup = two.makeGroup();
poetryGroup.addTo(background);
poetryGroup.id = 'poetry-group';

/*
 * Foreground Groups
 */

var textGroup = two.makeGroup();
textGroup.addTo(foreground);
textGroup.id = 'text-group';


/*
 * Bounding Box Template
 * Mostly to help transform and scale SVGs
 */

for (var i = 0; i < background.children.length - 1; i++) {
  var bb = two.makeRectangle(250, two.height / 2, 500, two.height);
  bb.noStroke().noFill().visible = false;
  background.children[i].add(bb);
}


/*
 * Timer Line
 */

var timerLine = two.makeLine(0, 187, 130, 187);
timerLine.visible = false;
timerLine.linewidth = 10;
timerLine.noFill().stroke = 'white';
timerLine.opacity = .4
textGroup.add(timerLine);


/*
 * Text
 */

var textStyles = {
  family: "'Fjalla One', sans-serif",
  weight: 400,
  alignment: 'left',
  visible: false,
  fill: 'white'
};

textStyles['size'] = 50;
textStyles['leading'] = 50;
var andy = two.makeText('Andy', 0, 20, textStyles);
var makes = two.makeText('Makes', 0, 90, textStyles);
var things = two.makeText('Things', 0, 160, textStyles);
textGroup.add(andy, makes, things);
textGroup.translation.set(16, 88);

var utils = {
  randomNumber: function(max, min, whole = true) {
    if (whole) {
      return Math.floor(Math.random() * (max - min)) + min;
    } else {
      return Math.random() * (max - min) + min;
    }
  },
  resize: function(background, foreground) {
    background.scale = document.documentElement.clientHeight / 738;
  },
  fade: function(objects, direction, frameCount, start, end) {
    if (frameCount >= start && frameCount <= end){
      for (var i = 0; i < objects.length; i++) {
        if (direction == 1) {
          if (objects[i].opacity < 1) {
            objects[i].opacity += .1;
          } else if (objects[i].opacity > 1){
            objects[i].opacity = Math.floor(objects[i].opacity)
          }
        } else {
          if (objects[i].opacity > 0) {
            objects[i].opacity -= .1;
          } else if (objects[i].opacity < 0){
            objects[i].opacity = Math.floor(objects[i].opacity)
          }
        }
      }
    }
  },
  handleTimer: function(timeOut, frameCount, things, timerLine) {
    //var timerWidth = things.getBoundingClientRect().width;
    var modulo = frameCount % timeOut;
    var pctTime = modulo / timeOut;
    var pctBar = pctTime * 130;
    timerLine.vertices[1].x = 65 - pctBar;
  }
}

/*
 * Beams
 */

var beams = {
  group: thingsGroup,
  paths: [],
  animate: function(frameCount, startFrame, endFrame) {
    if (frameCount >= startFrame && frameCount <= endFrame && frameCount % 3 == 0){
      this.populate(10);

      // Animate beams
      for (var i = 0; i < this.paths.length; i++) {
        this.paths[i].controller.frameCount++;
        if (this.paths[i].controller.frameCount > this.paths[i].controller.length / 2) {
          this.paths[i].opacity -= this.paths[i].controller.speed;
        } else if (this.paths[i].opacity <= this.paths[i].controller.peak) {
          this.paths[i].opacity += this.paths[i].controller.speed;
        }
        this.paths[i].vertices[1].x += this.paths[i].controller.travel;
        this.paths[i].vertices[2].x += this.paths[i].controller.travel;

        if (this.paths[i].opacity <= 0) {
          this.paths[i].opacity = 0;
          this.paths[i].controller = this.createController();
        }
      }
    }
  },
  create: function() {
    var beam = two.makePath(300, 0, utils.randomNumber(400, 0), two.height, utils.randomNumber(400, 0), two.height)
    beam.noStroke().fill = '#FFEB3B';
    beam.opacity = 0;
    beam.controller = this.createController();
    this.paths.push(beam);
    this.group.add(beam)
  },
  createController: function() {
    return {
      peak: utils.randomNumber(.3, .1, false),
      length: utils.randomNumber(180, 30, false),
      speed: utils.randomNumber(.1, .01, false),
      travel: utils.randomNumber(.5, -.5, false),
      frameCount: 0
    }
  },
  populate: function(target) {
    if (this.paths.length < target) {
      var current = this.paths.length;
      for (var i = current; i < target; i++) {
        this.create();
      }
    }
  },
  destroy: function() {
    this.group.remove(this.paths);
    this.paths = [];
  }
}


/*
 * Poetry
 */

var poetry = {
  group: poetryGroup,
  paths: [],
  line: {
    x: 20,
    y: -30,
    height: 40,
    minWidth: 100,
    maxWidth: 380
  },
  step: 60,

  create: function(i) {
    var width = utils.randomNumber(this.line.maxWidth, this.line.minWidth);
    var line = two.makeRectangle(
      (width / 2) + this.line.x,
      this.line.y + (i * this.step),
      width,
      this.line.height
    );
    line.rotation = utils.randomNumber(5, -5) * (Math.PI / 180);
    line.noStroke().fill = 'red';
    line.opacity = .75;
    for (var v = 0; v < 4; v++) {
      line.vertices[v].ogx = line.vertices[v].x;
    }
    this.paths.push(line);
    this.group.add(line);
  },
  populate: function() {
    var target = Math.floor(document.documentElement.clientHeight / this.step);
    var current = this.paths.length;
    if (current < target) {
      for (var i = current; i <= target; i++) {
        this.create(i);
      }
    }
  },
  animate: function(frameCount, startFrame, endFrame) {
    if (frameCount >= startFrame && frameCount <= endFrame && frameCount % 3 == 0) {
      this.populate();

      for (var i = 0; i < this.paths.length; i++) {
        for (var v = 0; v < 4; v++) {
          if (this.paths[i].vertices[v].hasOwnProperty('jitter')) {
            this.paths[i].vertices[v].x += this.paths[i].vertices[v].dir;
            if (this.paths[i].vertices[v].x == this.paths[i].vertices[v].ogx + this.paths[i].vertices[v].jitter) {
              this.paths[i].vertices[v].dir = this.paths[i].vertices[v].dir * -1;
            }
            if (this.paths[i].vertices[v].x == this.paths[i].vertices[v].ogx) {
              delete this.paths[i].vertices[v].jitter;
              delete this.paths[i].vertices[v].dir;
            }
          } else {
            var jitter = 0;
            while (jitter == 0) {
              jitter = utils.randomNumber(6, -6);
            }
            this.paths[i].vertices[v].jitter = jitter;
            this.paths[i].vertices[v].dir = this.paths[i].vertices[v].jitter > 0 ? 1 : -1;
          }
        }
      }
    }
  },
  destroy: function() {
    this.group.remove(this.paths);
    this.paths = [];
  }
}


/*
 * Gears
 */

var gears = {
  group: gadgetsGroup,
  diametralPitch: Math.PI / 24,
  colors: ['#D500F9', '#00B0FF', '#FF1744'],
  teeth: [18, 36, 52],
  assemblies: [],
  gears: [],
  scaleRatio: undefined,
  pinionStep: .25,
  animate: function(frameCount, startFrame, endFrame) {
    if (frameCount >= startFrame && frameCount <= endFrame) {
      if (this.assemblies.length != document.getElementById('gears').children.length) {
        this.populate();
        this.place();
      }

      // RPM = Step * FPS * Seconds
      var pinionRPM = this.pinionStep * 60 * 60;

      this.gears[0].rotation += this.pinionStep * (Math.PI / 180);
      if (this.gears[0].rotation >= 360) {
        this.gears[0].rotation = 0;
      }

      // s1 * teeth1 = s2 * teeth2
      this.gear1Step = ((pinionRPM * this.gears[0].teeth) / this.gears[1].teeth) / 60 / 60;
      this.gears[1].rotation -= this.gear1Step * (Math.PI / 180);
      if (this.gears[1].rotation >= 360) {
        this.gears[1].rotation = 0;
      }

      this.gear2Step = ((pinionRPM * this.gears[0].teeth) / this.gears[2].teeth) / 60 / 60;
      this.gears[2].rotation -= this.gear2Step * (Math.PI / 180);
      if (this.gears[2].rotation >= 360) {
        this.gears[2].rotation = 0;
      }
    }
  },
  create: function(i, svg) {
    var assembly = two.makeGroup();
    this.assemblies.push(assembly);
    var gear = two.interpret(svg).center();
    assembly.add(gear);
    this.gears.push(gear);
    if (this.scaleRatio == undefined) {
      this.scaleRatio = 200 / gear.getBoundingClientRect().width;
    }
    gear.scale = this.scaleRatio;
    gear.teeth = this.teeth[i];
    gear.diametralPitch = (gear.teeth + 2) / gear.getBoundingClientRect().width;
    gear.pitchDiameter = gear.getBoundingClientRect().width - (2 / gear.diametralPitch);
    gear.fill = gear.stroke = this.colors[i];
    gear.opacity = .7;

    var circle = two.makeCircle(0, 0, (gear.getBoundingClientRect().width - 60) / 2);
    assembly.add(circle);
    circle.fill =  '#212121'; // colors[i];
    circle.stroke = this.colors[i];
    circle.linewidth = 15;
    this.group.add(assembly);
  },
  populate: function() {
    var svgs = document.getElementById('gears').children;
    for (var i = 0; i < svgs.length; i++) {
      this.create(i, svgs[i]);
    }
  },
  place: function() {
    this.assemblies[1].translation.set(50, 547.5);
    this.assemblies[0].translation.set(
      this.assemblies[1].translation.x + ((this.assemblies[1].children[0].pitchDiameter + this.assemblies[0].children[0].pitchDiameter) / 2) * Math.cos(-(5 * (360 / 36)) * (Math.PI / 180)),
      this.assemblies[1].translation.y + ((this.assemblies[1].children[0].pitchDiameter + this.assemblies[0].children[0].pitchDiameter) / 2) * Math.sin(-(5 * (360 / 36)) * (Math.PI / 180))
    );

   this.assemblies[2].translation.set(
      this.assemblies[0].translation.x + ((this.assemblies[2].children[0].pitchDiameter + this.assemblies[0].children[0].pitchDiameter) / 2) * Math.cos((13 * (360 / 18) - .25) * (Math.PI / 180)),
      this.assemblies[0].translation.y + ((this.assemblies[2].children[0].pitchDiameter + this.assemblies[0].children[0].pitchDiameter) / 2) * Math.sin((13 * (360 / 18) - .25) * (Math.PI / 180))
    );
  },
  destroy: function() {
    this.group.remove(this.assemblies);
    this.assemblies = [];
    this.gears = [];
  }
 }

for (var i = 0; i < background.children.length; i++) {
  background.children[i].visible = false;
  background.children[i].opacity = 0;
}

utils.resize(gadgetsGroup);
var iframeCount = 0;
two.bind('resize', function() {
    utils.resize(background);
  })
  .bind('update', function(frameCount) {
    if (frameCount == 20) {
      andy.visible = true;
    }
    if (frameCount == 50) {
      makes.visible = true;
    }
    if (frameCount == 80) {
      timerLine.visible = true;
      utils.fade([timerLine], 1, frameCount, 80, 89);
    }

    if (frameCount >= 80) {
      timerLine.visible = true;
      utils.handleTimer(450, iframeCount, things, timerLine);
      beams.animate(iframeCount, 0, 449);
      poetry.animate(iframeCount, 450, 899);
      gears.animate(iframeCount, 900, 1349);

      if (iframeCount == 0) {
        things.visible = true;
        things.value = 'Things';
      }
      if (iframeCount == 449) {
        thingsGroup.visible = false;
        beams.destroy();
      }
      utils.fade([makes, things, thingsGroup], 1, iframeCount, 0, 9);
      utils.fade([makes, things, thingsGroup], -1, iframeCount, 440, 449)

      if (iframeCount == 450) {
        poetryGroup.visible = true;
        makes.value = 'Crafts'
        things.value = 'Poems';
      }
      if (iframeCount == 899) {
        poetryGroup.visible = false;
        poetry.destroy();
      }
      utils.fade([makes, things, poetryGroup], 1, iframeCount, 450, 459);
      utils.fade([makes, things, poetryGroup], -1, iframeCount, 890, 899);

      if (iframeCount == 900) {
        makes.value = 'Constructs';
        things.value = 'Gadgets';
        gadgetsGroup.visible = true;
      }
      if (iframeCount == 1349) {
        gears.destroy();
      }
      utils.fade([makes, things, gadgetsGroup], 1, iframeCount, 900, 909);
      utils.fade([makes, things, gadgetsGroup], -1, iframeCount, 1340, 1349);

      iframeCount += 1;
      if (iframeCount == 1350) {
        iframeCount = 0;
        makes.value = 'Makes';
        things.value = 'Things';
      }
    }
  }).play();

function openNav() {
    document.getElementById("nav").style.width = "250px";
}

function closeNav() {
    document.getElementById("nav").style.width = "0";
}
