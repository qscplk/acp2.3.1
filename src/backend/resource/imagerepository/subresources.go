package imagerepository

import (
	"alauda.io/devops-apiserver/pkg/apis/devops/v1alpha1"
	devopsclient "alauda.io/devops-apiserver/pkg/client/clientset/versioned"

	"log"
)

// Trigger image scan job
func ScanImage(client devopsclient.Interface, namespace, name, tag string) (*v1alpha1.ImageResult, error) {

	scanOpts := &v1alpha1.ImageScanOptions{
		Tag: tag,
	}
	log.Println("Scan image repository: ", name, " tag: ", tag)
	result, err := client.DevopsV1alpha1().ImageRepositories(namespace).ScanImage(name, scanOpts)
	if err != nil {
		log.Println("Error trigger scan image: ", err)
		return nil, err
	}
	return result, nil
}

// Get image Vulnerability
func GetVulnerability(client devopsclient.Interface, namespace, name, tag string) (*v1alpha1.VulnerabilityList, error) {

	scanOpts := &v1alpha1.ImageScanOptions{
		Tag: tag,
	}
	log.Println("Get image vulnerability repository: ", name, " tag: ", tag)

	vulnerabilityList, err := client.DevopsV1alpha1().ImageRepositories(namespace).GetVulnerability(name, scanOpts)
	if err != nil {
		log.Println("Error get image vulnerability: ", err)
		return nil, err
	}
	return vulnerabilityList, nil
}

func GetImageTags(client devopsclient.Interface, namespace, name, sortBy, sortMode string) (*v1alpha1.ImageTagResult, error) {
	opts := &v1alpha1.ImageTagOptions{
		SortBy:   sortBy,
		SortMode: sortMode,
	}
	log.Println("Get image tags repository: ", name, " sortBy: ", sortBy, " sortMode: ", sortMode)

	tags, err := client.DevopsV1alpha1().ImageRepositories(namespace).GetImageTags(name, opts)
	if err != nil {
		log.Println("Error get image tags: ", err)
		return nil, err
	}
	return tags, nil
}
