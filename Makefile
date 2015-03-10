all: beta release

beta: beta.zip

release: release.zip

clean:
	rm -f beta.zip
	rm -f release.zip
	rm -rf tmp

beta.zip: src/* beta/*
	rm -f beta.zip
	rm -rf tmp
	cp -a src/ tmp/
	cp beta/manifest.json tmp/
	zip -r beta.zip tmp/*
	rm -rf tmp

release.zip:
	rm -f release.zip
	rm -rf tmp
	mkdir tmp
	cp -a src/ tmp/
	cp key.pem src/
	zip -r release.zip tmp/*
	rm src/key.pem
	rm -rf tmp