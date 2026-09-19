import re, sys, time, pathlib
p = pathlib.Path('index.html')
s = p.read_text()
v = str(int(time.time()))
s = re.sub(r'(<script src="js/[a-z]+\.js)(\?v=\d+)?(")', lambda m: m.group(1) + '?v=' + v + m.group(3), s)
p.write_text(s)
print('cache token', v)
