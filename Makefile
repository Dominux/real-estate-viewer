run:
	python3 -m http.server

download_libs:
	wget https://cdn.babylonjs.com/babylon.js -O ./lib/babylon.js
	wget https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js -O ./lib/babylon-loaders.js

publish:
	git branch -D gh_pages || true
	git checkout -b gh_pages
	make download_libs
	rm .gitignore lib/.gitkeep
	git add -A
	git commit -m "Published"
	git push --set-upstream origin gh_pages -f
	git checkout -
