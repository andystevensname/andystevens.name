export function createGears(two: any, group: any, gearsContainer: Element) {
  const colors = ['#D500F9', '#00B0FF', '#FF1744'];
  const teeth = [18, 36, 52];
  const assemblies: any[] = [];
  const gears: any[] = [];
  let scaleRatio: number | undefined;
  const pinionStep = 0.25;
  let gear1Step = 0;
  let gear2Step = 0;

  function create(i: number, svg: Element) {
    const pathEl = svg.querySelector('path') as SVGElement;
    const assembly = two.makeGroup();
    assemblies.push(assembly);
    const gear = two.interpret(pathEl).center();
    assembly.add(gear);
    gears.push(gear);
    if (scaleRatio === undefined) {
      scaleRatio = 200 / gear.getBoundingClientRect().width;
    }
    gear.scale = scaleRatio;
    gear.teeth = teeth[i];
    gear.diametralPitch = (teeth[i] + 2) / gear.getBoundingClientRect().width;
    gear.pitchDiameter = gear.getBoundingClientRect().width - 2 / gear.diametralPitch;
    gear.fill = 'transparent';
    gear.stroke = colors[i];
    gear.linewidth = 5;
    gear.opacity = 0.7;

    const circle = two.makeCircle(0, 0, (gear.getBoundingClientRect().width - 60) / 2);
    assembly.add(circle);
    circle.fill = 'transparent';
    circle.stroke = colors[i];
    circle.linewidth = 15;
    group.add(assembly);
  }

  function populate() {
    const svgs = gearsContainer.children;
    for (let i = 0; i < svgs.length; i++) create(i, svgs[i]);
  }

  function place() {
    assemblies[1].translation.set(50, 547.5);
    assemblies[0].translation.set(
      assemblies[1].translation.x + ((assemblies[1].children[0].pitchDiameter + assemblies[0].children[0].pitchDiameter) / 2) * Math.cos(-(5 * (360 / 36)) * (Math.PI / 180)),
      assemblies[1].translation.y + ((assemblies[1].children[0].pitchDiameter + assemblies[0].children[0].pitchDiameter) / 2) * Math.sin(-(5 * (360 / 36)) * (Math.PI / 180)),
    );
    assemblies[2].translation.set(
      assemblies[0].translation.x + ((assemblies[2].children[0].pitchDiameter + assemblies[0].children[0].pitchDiameter) / 2) * Math.cos((13 * (360 / 18) - 0.25) * (Math.PI / 180)),
      assemblies[0].translation.y + ((assemblies[2].children[0].pitchDiameter + assemblies[0].children[0].pitchDiameter) / 2) * Math.sin((13 * (360 / 18) - 0.25) * (Math.PI / 180)),
    );
  }

  return {
    assemblies,
    gears,
    animate(frameCount: number, startFrame: number, endFrame: number) {
      if (frameCount >= startFrame && frameCount <= endFrame) {
        if (assemblies.length !== gearsContainer.children.length) {
          populate();
          place();
        }
        const pinionRPM = pinionStep * 60 * 60;
        gears[0].rotation += pinionStep * (Math.PI / 180);
        if (gears[0].rotation >= 360) gears[0].rotation = 0;

        gear1Step = (pinionRPM * gears[0].teeth) / gears[1].teeth / 60 / 60;
        gears[1].rotation -= gear1Step * (Math.PI / 180);
        if (gears[1].rotation >= 360) gears[1].rotation = 0;

        gear2Step = (pinionRPM * gears[0].teeth) / gears[2].teeth / 60 / 60;
        gears[2].rotation -= gear2Step * (Math.PI / 180);
        if (gears[2].rotation >= 360) gears[2].rotation = 0;
      }
    },
    destroy() {
      group.remove(assemblies);
      assemblies.length = 0;
      gears.length = 0;
    },
  };
}
