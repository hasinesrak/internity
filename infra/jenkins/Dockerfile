FROM jenkins/jenkins:lts-jdk21

USER root

RUN apt-get update \
 && apt-get install --yes --no-install-recommends ca-certificates curl git gnupg \
 && install --mode=0755 --directory /etc/apt/keyrings \
 && curl --fail --silent --show-error --location https://download.docker.com/linux/debian/gpg --output /etc/apt/keyrings/docker.asc \
 && chmod a+r /etc/apt/keyrings/docker.asc \
 && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" > /etc/apt/sources.list.d/docker.list \
 && apt-get update \
 && apt-get install --yes --no-install-recommends docker-ce-cli docker-buildx-plugin \
 && curl --fail --silent --show-error --location https://deb.nodesource.com/setup_22.x | bash - \
 && apt-get install --yes --no-install-recommends nodejs \
 && npm install --global pnpm@10.33.4 \
 && rm -rf /var/lib/apt/lists/*

COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt

USER jenkins
